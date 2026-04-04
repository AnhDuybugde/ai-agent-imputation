import os
import json
from huggingface_hub import InferenceClient

def load_hf_token():
    # Try reading from frontend .env (for local)
    env_path = os.path.join(os.path.dirname(__file__), "..", "frontend", ".env")
    if os.path.exists(env_path):
        with open(env_path, "r", encoding="utf-8") as f:
            for line in f:
                if line.startswith("HUGGINGFACE_API_KEY="):
                    return line.strip().split("=")[1].strip()
    return os.environ.get("HUGGINGFACE_API_KEY", "")

def generate_agent_decision(eda_summary, missing_count, target_col):
    """
    Calls the HuggingFace Inference API via huggingface_hub to simulate a Data Scientist Agent.
    """
    fallback_response = {
        "reasoning": f"Based on internal fallback heuristics (API unreachable or unconfigured), the non-linear complexity requires a robust boosting algorithm. HGBT is selected to map surrounding covariant spatial features.",
        "model": "HGBT"
    }

    token = load_hf_token()
    if not token:
        # Without a token, fallback immediately
        return fallback_response

    client = InferenceClient(api_key=token)

    system_msg = """You are a Senior Spatial-Temporal Data Scientist AI Agent.
Your task is to analyze the meteorological dataset characteristics and select the best imputation algorithm for filling missing gaps.
Available algorithms: ['HGBT' (for non-linear/complex gaps), 'Ridge' (for high variance linear stabilization), 'KNN' (for robust spatial proximity mapping), 'LN' (for simple linear trends)].
Respond EXACTLY and ONLY in the following JSON format without formatting ticks or explanation:
{"reasoning": "your detailed step-by-step logic", "model": "MODEL_NAME"}"""

    user_msg = f"""[Data Overview]
Target Feature: {target_col}
Total Missing Values Detected: {missing_count}
Statistical Abstract: {json.dumps(eda_summary)}

Analyze this and output the JSON array."""

    try:
        # Use conversational format
        messages = [
            {"role": "system", "content": system_msg},
            {"role": "user", "content": user_msg}
        ]
        
        response = client.chat_completion(
            model="Qwen/Qwen2.5-72B-Instruct",
            messages=messages,
            max_tokens=300,
            temperature=0.3
        )
        
        result_text = response.choices[0].message.content.strip()
        
        # Defensive clean up (sometimes models output ```json ... ```)
        if "```json" in result_text:
            result_text = result_text.split("```json")[1].split("```")[0].strip()
        elif "```" in result_text:
            result_text = result_text.replace("```", "").strip()
            
        data = json.loads(result_text)
        
        # Ensure fallback safety
        if "model" not in data or data["model"] not in ['HGBT', 'Ridge', 'KNN', 'LN']:
            data["model"] = "HGBT"
            
        return data

    except Exception as e:
        print(f"Agent Core Exception: {e}")
        return fallback_response
