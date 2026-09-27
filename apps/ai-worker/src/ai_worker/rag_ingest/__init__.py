"""RAG 摄入：把 core 的资产正文变成可检索的分块与向量。

本包在 **P6b-3 落地**（分块 + `POST /internal/v1/assets/{assetID}/chunks`），
向量与索引在 **P6b-4**。现在只是占位：包能被导入，能力才能登记进 `capabilities`，
否则健康探针会报一个「代码写了一半」的能力。
"""
