import pandas as pd
import string
import nltk
from nltk.corpus import stopwords
from nltk.tokenize import word_tokenize
from sklearn.feature_extraction.text import CountVectorizer
from sklearn.decomposition import LatentDirichletAllocation
import json

OUTPUT_FILE_PATH = "../../public/data/"

nltk.download('punkt_tab')
nltk.download('punkt')
nltk.download('stopwords')

df = pd.read_csv('TNM098-MC3-2011.csv', lineterminator='\n', sep=';')
df.columns = df.columns.str.strip()

# Load the standard English stop words
stop_words = set(stopwords.words('english'))


# ==========================================
# HELPERS
# ==========================================

def preprocess_text(text):
    """Lowercase, strip punctuation, tokenize, and remove stop words."""
    if not isinstance(text, str):
        return []
    text = text.lower()
    text = text.translate(str.maketrans('', '', string.punctuation))
    tokens = word_tokenize(text)
    return [word for word in tokens if word not in stop_words]

def contains_keywords(tokens, keywords):
    """Return True if any keyword appears in the token list."""
    return bool(set(tokens) & keywords)

def export_timeline(df, filename='timeline_data.json'):
    """Save the current state of timeline_df to JSON."""
    df.to_json(OUTPUT_FILE_PATH + filename, orient='records')

def merge_into_timeline(timeline_df, new_df, on='Date', fill=0):
    """Left-merge new_df into timeline_df, filling missing values with `fill`."""
    merged = pd.merge(timeline_df, new_df, on=on, how='left').fillna(fill)
    # Cast any new integer-like columns back to int (fillna promotes them to float)
    new_cols = [c for c in new_df.columns if c != on]
    merged[new_cols] = merged[new_cols].astype(int)
    return merged


# ==========================================
# STEP 1: Preprocessing
# ==========================================

# Apply preprocessing to the 'Content' column and store results in 'Cleaned_Content'
df['Cleaned_Content'] = df['Content'].apply(preprocess_text)

print("--- ORIGINAL CONTENT (Snippet) ---")
print(df['Content'].iloc[0][:150], "...\n")
print("--- CLEANED & TOKENIZED ---")
print(df['Cleaned_Content'].iloc[0][:15])


# ==========================================
# STEP 2: Temporal Distribution
# ==========================================

# Count how many reports were published each day and sort chronologically
timeline_df = (
    df.groupby('Date')
    .size()
    .reset_index(name='Total_Reports')
    .sort_values(by='Date')
)

export_timeline(timeline_df)
print("\n--- STEP 2: TEMPORAL DISTRIBUTION ---")
print("Successfully exported 'timeline_data.json'!")
print(timeline_df.head())


# ==========================================
# STEP 3, 4, & 5: Filter Subset & Compare Timelines
# ==========================================

# Define threat-related keywords to filter relevant reports
keywords = {'threat', 'terrorism', 'terrorist', 'dead', 'attack',
            'explosion', 'bomb', 'explosive', 'network', 'dread'}

# Keep only reports whose cleaned tokens contain at least one keyword
filtered_df = df[df['Cleaned_Content'].apply(contains_keywords, keywords=keywords)].copy()

print(f"\n--- STEP 3: FILTERING DATASET ---")
print(f"Reduced dataset from {len(df)} total reports to {len(filtered_df)} relevant reports.")

# Count filtered reports per day, then merge back so days with 0 matches are preserved
filtered_timeline = filtered_df.groupby('Date').size().reset_index(name='Filtered_Reports')
timeline_df = merge_into_timeline(timeline_df, filtered_timeline)

export_timeline(timeline_df)
print("\n--- STEP 4 & 5: COMPARING TEMPORAL DISTRIBUTIONS ---")
print("Updated 'timeline_data.json' with filtered counts!")
print(timeline_df.head())


# ==========================================
# STEP 6: Topic Modelling (LDA)
# ==========================================

print("\n--- STEP 6: TOPIC MODELLING ---")

# LDA expects plain strings, so rejoin the token lists into single strings
filtered_df['Joined_Content'] = filtered_df['Cleaned_Content'].apply(' '.join)

# Build a Document-Term Matrix; ignore words in >85% of docs or fewer than 2 docs
vectorizer = CountVectorizer(max_df=0.85, min_df=2)
dtm = vectorizer.fit_transform(filtered_df['Joined_Content'])

# Fit the LDA model with 3 topics
num_topics = 3
lda_model = LatentDirichletAllocation(n_components=num_topics, random_state=42)
lda_model.fit(dtm)

# Extract the top 15 words and their weights for each topic
feature_names = vectorizer.get_feature_names_out()
topics_data = [
    {
        "topic_id": topic_idx + 1,
        # argsort()[:-16:-1] gives indices of the 15 highest-weight words, descending
        "top_words": [
            {"text": feature_names[i], "value": round(topic[i], 2)}
            for i in topic.argsort()[:-16:-1]
        ]
    }
    for topic_idx, topic in enumerate(lda_model.components_)
]

with open(OUTPUT_FILE_PATH + 'topics_data.json', 'w') as f:
    json.dump(topics_data, f, indent=4)

print(f"Successfully generated {num_topics} topics and exported to 'topics_data.json'!")
for t in topics_data:
    print(f"Topic {t['topic_id']}: {', '.join(w['text'] for w in t['top_words'][:5])}")


# ==========================================
# STEP 7: Topic Temporal Distribution
# ==========================================

print("\n--- STEP 7: TOPIC TEMPORAL DISTRIBUTION ---")

# Get the per-document topic probability distribution, then pick the dominant topic
doc_topic_dist = lda_model.transform(dtm)
filtered_df['Dominant_Topic'] = doc_topic_dist.argmax(axis=1) + 1  # 1-indexed

# Count articles per (Date, Dominant_Topic) pair and pivot so each topic is its own column
topic_timeline = (
    filtered_df.groupby(['Date', 'Dominant_Topic'])
    .size()
    .unstack(fill_value=0)
    .rename(columns=lambda col: f'Topic_{col}')
)

timeline_df = merge_into_timeline(timeline_df, topic_timeline.reset_index())

export_timeline(timeline_df)
print("Successfully merged topic distributions into 'timeline_data.json'!")
print(timeline_df.head())


# ==========================================
# PREP FOR STEP 9: Export Raw Reports
# ==========================================

# Export just the columns needed for the Next.js drill-down view
filtered_df[['ID', 'Date', 'Title', 'Content', 'Dominant_Topic']].to_json(
    OUTPUT_FILE_PATH + 'reports_data.json', orient='records'
)
print("Exported 'reports_data.json' for Next.js drill-down!")