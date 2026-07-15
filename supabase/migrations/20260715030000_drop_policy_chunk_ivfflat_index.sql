-- The ivfflat index was built while policy_document_chunks was empty, which
-- leaves its clusters degenerate: with the default probes=1, cosine_distance
-- ORDER BY queries can silently miss the true nearest neighbor (verified: a
-- sequential scan finds rows the index scan doesn't). At the expected corpus
-- size for a single SME's policy documents (tens to low hundreds of chunks),
-- brute-force cosine distance is both correct and fast enough, so drop the
-- approximate index rather than tune around it.
DROP INDEX IF EXISTS policy_document_chunks_embedding_idx;
