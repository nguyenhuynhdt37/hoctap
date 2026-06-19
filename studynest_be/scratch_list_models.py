import google.generativeai as genai

from app.core.settings import settings

def main():
    api_key = settings.GOOGLE_API_KEY_CHAT or settings.GOOGLE_API_KEY
    if not api_key:
        raise RuntimeError("Missing GOOGLE_API_KEY_CHAT or GOOGLE_API_KEY in environment variables.")

    genai.configure(api_key=api_key)
    print("Listing available models for the API key...")
    try:
        models = genai.list_models()
        for m in models:
            print(f"Name: {m.name}, Supported Actions: {m.supported_generation_methods}")
    except Exception as e:
        print("Error listing models:", e)

if __name__ == "__main__":
    main()
