import os


def prettify_source(source):
    document = os.path.basename(source.get("document"))
    vector_score = source.get("score")
    rerank_score = source.get("rerank_score", vector_score)
    content_preview = source.get("content_preview")
    return (
        f"• **{document}** \n\n"
        f" **Rerank Score ({round(rerank_score, 2)})** · "
        f"**Vector Score ({round(vector_score, 2)})** \n\n"
        f" **Preview:** \n >{content_preview} \n"
    )
