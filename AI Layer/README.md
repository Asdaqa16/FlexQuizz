# AdaptLearn AI Integration Layer

This module provides pure async Python functions to handle all LLM and NLP operations. It expects plain Python types/Pydantic models as inputs and guarantees structured outputs.

## Setup
1. `pip install google-genai pydantic pypdf python-dotenv`
2. Create a `.env` file in the root directory:
   ```env
   GEMINI_API_KEY="your_api_key_here"