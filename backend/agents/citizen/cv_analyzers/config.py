"""Configuration for CV analyzer agents."""

# LLM settings for CV analysis (override shared defaults as needed)
CV_ANALYSIS_MODEL = "gemini-3.1-flash-lite-preview"
CV_ANALYSIS_TEMPERATURE = 0.1  # low temp for precise extraction
CV_ANALYSIS_MAX_TOKENS = 4096  # CVs can produce longer outputs
