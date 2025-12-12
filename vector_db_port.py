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


chroma_client = chromadb.PersistentClient(path="./chroma_db")

collection = chroma_client.get_or_create_collection(
    name="main_vault", metadata={"state": "need embedding"}
)

VAULT_DIR = Path.cwd().parent.parent.parent

data_file_path = Path("test_connect.json")


def init_chroma_db(collection):
    data = json.loads(data_file_path.read_text(encoding="utf-8"))
    collection.upsert(
        ids=[f"{item['path']}" for item in data],
        documents=[
            (VAULT_DIR / item["path"]).read_text(encoding="utf-8") for item in data
        ],
        metadatas=[{"type": item["extension"]} for item in data],
    )


def readallfile(collection):
    results = collection.get(include=["documents", "metadatas"])
    collection_file = Path("collection.json")
    collection_file.write_text(json.dumps(results, indent=4))


def build_hierarchical_tree(clustering):
    """
    Builds a hierarchical tree as a JSON-serializable dict from the AgglomerativeClustering model.

    :param clustering: The fitted AgglomerativeClustering model.
    :return: Dict representing the root of the tree.
    """
    n_samples = len(clustering.labels_)
    children_array = clustering.children_

    # Helper function to build the node recursively
    def build_node(node_idx):
        if node_idx < n_samples:
            # Leaf node
            return {
                "index": int(node_idx),
                "type": "leaf",
                "children": None,
                "left_node": None,
                "right_node": None,
            }
        else:
            # Internal node
            merge_idx = node_idx - n_samples
            left_idx, right_idx = children_array[merge_idx]

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
            }

    # Root index is n_samples + (n_samples - 2) = 2*n_samples - 2, but since len(children_) = n_samples - 1
    root_idx = n_samples + len(children_array) - 1
    return build_node(root_idx)


def hierarchical_clustering(X: np.ndarray) -> list[str]:
    def plot_dendrogram(model, **kwargs):
        # Create linkage matrix and then plot the dendrogram

        # create the counts of samples under each node
        counts = np.zeros(model.children_.shape[0])
        n_samples = len(model.labels_)
        for i, merge in enumerate(model.children_):
            current_count = 0
            for child_idx in merge:
                if child_idx < n_samples:
                    current_count += 1  # leaf node
                else:
                    current_count += counts[child_idx - n_samples]
            counts[i] = current_count

        linkage_matrix = np.column_stack(
            [model.children_, model.distances_, counts]
        ).astype(float)
        # Plot the corresponding dendrogram
        dendrogram(linkage_matrix, **kwargs)

    print(X.shape)

    clustering = AgglomerativeClustering(distance_threshold=0, n_clusters=None)
    clustering.fit(X)

    tree = build_hierarchical_tree(clustering)
    return tree


def generate_hierarchical_tags(collection, tree: dict) -> list[str]:
    all_doc = collection.get(include=["embeddings", "metadatas"])

    embedding_list = [x for x in all_doc["embeddings"]]

    all_doc_df = pd.DataFrame(
        {
            "ids": all_doc["ids"],
            "embeddings": embedding_list,
            "meta_data": all_doc["metadatas"],
        }
    )

    tree = hierarchical_clustering(all_doc["embeddings"])

    Path("tree.json").write_text(json.dumps(tree, indent=4))
    # hierarchical_tags = []

    # def traverse(node):
    #     if node["type"] == "leaf":
    #         hierarchical_tags.append(f"cluster_{node['index']}")
    #     else:
    #         traverse(node["left_node"])
    #         traverse(node["right_node"])

    # traverse(tree)
    # return hierarchical_tags


if __name__ == "__main__":
    # chroma_client.delete_collection(name="main_vault")
    # collection = chroma_client.create_collection(name="main_vault")
    # init_chroma_db(collection)
    # readallfile(collection)
    generate_hierarchical_tags(collection, {})
