from gc import collect
import chromadb
from chromadb.api.collection_configuration import collection_configuration_to_json
from chromadb.utils import embedding_functions
import json
from pathlib import Path
import numpy as np
import pandas as pd
from matplotlib import pyplot as plt
from scipy.cluster.hierarchy import dendrogram

from sklearn.cluster import AgglomerativeClustering
from sklearn.datasets import load_iris

from openai import OpenAI

# LLM_client = OpenAI(
#     api_key="sk-KvpjwQa2ENm5gp1bkFR4SR0kOvqfziV8klTTVijBkQJduzYO",  # 在这里将 MOONSHOT_API_KEY 替换为你从 Kimi 开放平台申请的 API Key
#     base_url="https://api.moonshot.cn/v1",
# )

LLM_client = None


chroma_client = chromadb.PersistentClient(path="./chroma_db")

collection = chroma_client.get_or_create_collection(
    name="main_vault", metadata={"state": "need embedding"}
)

VAULT_DIR = Path.cwd().parent.parent.parent

data_file_path = Path("test_connect.json")


def init_LLM_client(api_key: str):
    global LLM_client
    LLM_client = OpenAI(
        api_key=api_key,
        base_url="https://api.moonshot.cn/v1",
    )


def init_chroma_db(collection, data_file):
    """用于将获取的数据全部写入到 collection 中，
    需要保证 data_file 的结构与 test_connect.json 一致

    Args:
        collection (_type_): _description_
        data_file (_type_): _description_
    """
    # data = json.loads(data_file_path.read_text(encoding="utf-8"))
    collection.upsert(
        # ids=[f"{item['path']}" for item in data],
        ids=[f"{item['path']}" for item in data_file],
        documents=[
            (VAULT_DIR / item["path"]).read_text(encoding="utf-8") for item in data_file
        ],
        metadatas=[{"type": item["extension"]} for item in data_file],
    )


def readallfile(collection):
    """用于测试读取collection中的所有文件，并保存到 collection.json 中

    Args:
        collection (_type_): _description_
    """
    results = collection.get(include=["documents", "metadatas"])
    collection_file = Path("collection.json")
    collection_file.write_text(json.dumps(results, indent=4))


def llm_generate_tag(prompt: str) -> str:
    # response = LLM_client.chat.completions.create(
    #     model="gpt-4o-mini",  # 或你的模型
    #     messages=[{"role": "user", "content": prompt}],
    # )
    # return response.choices[0].message.content.strip()
    completion = LLM_client.chat.completions.create(
        model="kimi-k2-turbo-preview",
        messages=[
            {
                "role": "system",
                "content": "你是 Kimi，由 Moonshot AI 提供的人工智能助手，你更擅长中文和英文的对话。你会为用户提供安全，有帮助，准确的回答。同时，你会拒绝一切涉及恐怖主义，种族歧视，黄色暴力等问题的回答。Moonshot AI 为专有名词，不可翻译成其他语言。",
            },
            {"role": "user", "content": prompt},
        ],
        temperature=0.6,
    )
    # 通过 API 我们获得了 Kimi 大模型给予我们的回复消息（role=assistant）
    return completion.choices[0].message.content.strip()


def assign_tags(
    node: dict,
    doc_contents: list[str],
    index2ids: dict,
    threshold: float = 0.5,
) -> dict:
    """
    自底向上递归生成tag树。
    :param node: 当前节点
    :param doc_contents: 文档内容列表，按叶子index排序
    :param threshold: 合并阈值 (normalized_distance < threshold 时合并)
    :return: dict 表示的tag子树
    """
    if node["type"] == "leaf":
        index = node["index"]
        content = doc_contents[index]
        # 用LLM生成叶子tag
        tag = llm_generate_tag(
            # 至于要不要限制 content 的长度？
            # f"基于以下笔记内容，生成一个简短的核心英文tag: {content[:1000]}"
            f"""基于以下笔记内容，生成一个简短的核心英文tag:
            file_name: {index2ids[index]}
            content: {content}
            """
        )  # 截断避免token超
        return {tag: index}  # None可换成[index]存储文件ids

    # 递归子节点
    left_tag = assign_tags(node["left_node"], doc_contents, index2ids, threshold)
    right_tag = assign_tags(node["right_node"], doc_contents, index2ids, threshold)

    norm_dist = (
        node["normalized_distance"] if node["normalized_distance"] is not None else 0.0
    )

    if norm_dist < threshold:
        # 距离小：合并，生成父tag
        child_tags_str = json.dumps({**left_tag, **right_tag})  # 或提取子内容
        parent_tag = llm_generate_tag(
            f"""基于这些子tag或主题，生成一个概括性的父tag，要求不能是使用 "/" 等分隔符号合并，需要根据这些子tag或主题涵盖的内容和领域，给出更上面高层级的 tag 表示并保持简短，例如"CNN" + "LSTM" 可以合并为 "NeuralNetwork"。你只需要返回 NeuralNetwork 即可，不需要添加类似 父 tag 等前缀
            现在给出下面的子 tag，请你生成：{child_tags_str}"""
        )
        return {parent_tag: {**left_tag, **right_tag}}  # 嵌套
    else:
        # 距离大：平铺，不生成父tag
        return {**left_tag, **right_tag}


def build_hierarchical_tree(clustering):
    """
    Builds a hierarchical tree as a JSON-serializable dict from the AgglomerativeClustering model,
    including merge distances and normalized distances.

    :param clustering: The fitted AgglomerativeClustering model.
    :return: Dict representing the root of the tree.
    """
    n_samples = len(clustering.labels_)
    children_array = clustering.children_
    distances = clustering.distances_
    max_distance = (
        np.max(distances) if len(distances) > 0 else 1.0
    )  # Avoid division by zero

    # Helper function to build the node recursively
    def build_node(node_idx):
        if node_idx < n_samples:
            # Leaf node (no distance)
            return {
                "index": int(node_idx),
                "type": "leaf",
                "children": None,
                "left_node": None,
                "right_node": None,
                "distance": None,
                "normalized_distance": None,
            }
        else:
            # Internal node
            merge_idx = node_idx - n_samples
            left_idx, right_idx = children_array[merge_idx]
            distance = distances[merge_idx]
            normalized_distance = distance / max_distance

            left_node = build_node(left_idx)
            right_node = build_node(right_idx)

            # Collect all leaf children
            left_children = (
                [left_node["index"]]
                if left_node["type"] == "leaf"
                else left_node["children"]
            )
            right_children = (
                [right_node["index"]]
                if right_node["type"] == "leaf"
                else right_node["children"]
            )
            all_children = sorted(
                left_children + right_children
            )  # Sort for consistency

            return {
                "index": int(node_idx),
                "type": "node",
                "children": all_children,
                "left_node": left_node,
                "right_node": right_node,
                "distance": float(distance),
                "normalized_distance": float(normalized_distance),
            }

    # Root index is n_samples + (n_samples - 2) = 2*n_samples - 2, but since len(children_) = n_samples - 1
    root_idx = n_samples + len(children_array) - 1
    return build_node(root_idx)


def hierarchical_clustering(X: np.ndarray) -> list[str]:
    clustering = AgglomerativeClustering(distance_threshold=0, n_clusters=None)
    clustering.fit(X)
    tree = build_hierarchical_tree(clustering)
    return tree


def generate_hierarchical_tags(collection, tree: dict) -> dict:  # 返回dict

    # 读取所有的 doc 列表
    all_doc = collection.get(include=["embeddings", "metadatas", "documents"])

    embedding_list = [x for x in all_doc["embeddings"]]

    all_doc_df = pd.DataFrame(
        {
            "ids": all_doc["ids"],
            "embeddings": embedding_list,
            "meta_data": all_doc["metadatas"],
        }
    )

    # 根据 embeddings 获取以 index 表示的树状聚类结果
    tree = hierarchical_clustering(
        np.array(all_doc["embeddings"])
    )  # 确保embeddings是np.array

    Path("tree.json").write_text(json.dumps(tree, indent=4))

    # 生成 index -> ids 映射字典，后续会用到
    index_to_ids = {idx: doc_id for idx, doc_id in enumerate(all_doc["ids"])}
    Path("tree_id_map.json").write_text(json.dumps(index_to_ids, indent=4))

    # 获取doc_contents：假设metadatas有'content'键；否则从'path'读取文件
    doc_contents = all_doc["documents"]

    # 生成tag树
    tag_tree = assign_tags(tree, doc_contents, index_to_ids, threshold=0.5)

    Path("tag_tree.json").write_text(json.dumps(tag_tree, indent=4))

    return tag_tree


def assign_index_tags(tag_tree: dict) -> dict:
    """根据 tag_tree 为每个 index 分配对应的 tag

    Args:
        tag_tree (dict): _description_
        index_to_ids (dict): _description_

    Returns:
        dict: _description_
    """
    index_tag_maps = {}

    def dfs(node, tag_list):
        nonlocal index_tag_maps
        if isinstance(node, int):
            index_tag_maps[node] = tag_list[0] if len(tag_list) == 1 else tag_list[:-1]
        else:
            for key in node.keys():
                tag_list.append(key)
                dfs(node[key], tag_list)
                tag_list.pop()

    dfs(tag_tree, [])

    Path("index_tag_maps.json").write_text(json.dumps(index_tag_maps, indent=4))

    id_map = json.load(Path("tree_id_map.json").open("r"))

    ids_tags_maps = {id_map[str(k)]: v for k, v in index_tag_maps.items()}

    return ids_tags_maps


def test_llm():
    prompt = "你好，我叫李雷，1+1等于多少？"
    response = llm_generate_tag(prompt)
    print(response)


def entry_generate_tags_for_alldoc(data_metals, api_key):
    init_LLM_client(api_key)
    init_chroma_db(collection, data_metals)
    tag_tree = generate_hierarchical_tags(collection, {})
    ids_tags_maps = assign_index_tags(tag_tree)
    return ids_tags_maps


def get_internal_link_for_current_file(data: dict) -> dict:
    if collection.count() == 0:
        return {"error": "there is no doc in collection"}

    # 更新数据库
    collection.upsert(
        ids=data["path"],
        documents=data["content"],
        metadatas={"type": "md"},
    )

    query_file = collection.get(ids=data["path"], include=["embeddings"])

    results = collection.query(
        query_embeddings=query_file["embeddings"],
        include=["distances"],
    )

    # 过滤掉 distance 为 0 的自身结果，并按阈值保留
    threshold = 0.5  # 可调整的阈值
    filtered = {
        "ids": [],
        "distances": [],
    }
    for ids, dists in zip(results["ids"], results["distances"]):
        keep_ids = []
        keep_dists = []
        for id_, d in zip(ids, dists):
            if d > 1e-9 and d <= threshold:  # 去掉自身（distance≈0）并保留阈值内
                keep_ids.append(id_)
                keep_dists.append(d)
        filtered["ids"].append(keep_ids)
        filtered["distances"].append(keep_dists)

    Path("tmp/query.json").write_text(json.dumps(filtered, indent=4))

    return {"result": filtered}


if __name__ == "__main__":
    # chroma_client.delete_collection(name="main_vault")
    # collection = chroma_client.create_collection(name="main_vault")
    # init_chroma_db(collection)
    # readallfile(collection)
    # tag_tree = generate_hierarchical_tags(collection, {})

    tag_tree = json.load(Path("tag_tree.json").open("r"))

    ids_tags_maps = assign_index_tags(tag_tree)
    Path("ids_tags_maps.json").write_text(
        json.dumps(ids_tags_maps, indent=4)
    )  # 保存 id -> tags 映射

    # test_llm()
