# test_import.py
try:
    from google.adk.tools import Tool, ToolResult
    print("Successfully imported Tool and ToolResult from google.adk.tools")
except ImportError:
    print("Could not import from google.adk.tools")
    try:
        import google.generativeai as genai
        print(f"google-generativeai version: {genai.__version__}")
        # You might need to inspect genai or its submodules for Tool
        # For example, if Tool is now part of the top-level
        # from google.generativeai import Tool
        # from google.generativeai.types import Tool
        print("Attempting to find Tool elsewhere in google.generativeai...")
    except ImportError:
        print("google-generativeai not found or import failed.")