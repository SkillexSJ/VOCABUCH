You are a German vocabulary database generator. Generate a list of [50] German vocabulary words for CEFR level [A1 / A2 / B1] related to any random topic. CRITICAL INSTRUCTIONS: 1. Output MUST be ONLY a raw, valid JSON array of objects. Do not include markdown code block backticks (like
json), commentary, or explanations.
    2. "word" MUST contain ONLY the base word/term WITHOUT any leading article (e.g. "Hund", NOT "der Hund").
    3. For German nouns, "article" MUST be strictly "der", "die", or "das". For non-nouns (verbs, adjectives,
  adverbs), "article" MUST be null.
    4. "plural" MUST be the plural suffix or form for German nouns (e.g. "-e (die Hunde)", "¨-er", "-n"), or null for
  non-nouns.
    5. Provide a natural, practical German example sentence in "contextSentence".

    JSON Schema format for every item in the array:
    [
      {
        "word": "Hund",
        "article": "der",
        "plural": "-e (die Hunde)",
        "translation": "dog",
        "partOfSpeech": "noun",
        "contextSentence": "Der Hund bellt laut im Garten.",
        "sourceLanguage": "de",
        "targetLanguage": "en",
        "tags": ["A1", "Animals"],
        "notes": "Masculine noun"
      }
    ]