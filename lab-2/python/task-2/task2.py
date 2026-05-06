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

# Download required NLTK data files (you only need to run these once)
nltk.download('punkt')
nltk.download('stopwords')

df = pd.read_csv('TNM098-MC3-2011.csv', lineterminator='\n', sep=';')

df.columns = df.columns.str.strip()

# Load the standard English stop words
stop_words = set(stopwords.words('english'))

# Define a function to handle all the preprocessing steps
def preprocess_text(text):
    # Handle any empty rows safely
    if not isinstance(text, str):
        return []
    
    # Step 1: Make everything lowercase
    text = text.lower()
    
    # Step 2: Remove punctuation using string translation
    text = text.translate(str.maketrans('', '', string.punctuation))
    
    # Step 3: Tokenize (split the string into a list of individual words)
    tokens = word_tokenize(text)
    
    # Step 4: Remove stop words
    cleaned_tokens = [word for word in tokens if word not in stop_words]
    
    return cleaned_tokens

# Apply the preprocessing function to the 'Content' column
# and save the results in a new column called 'Cleaned_Content'
df['Cleaned_Content'] = df['Content'].apply(preprocess_text)

# Let's verify it worked by checking the first article!
print("--- ORIGINAL CONTENT (Snippet) ---")
print(df['Content'].iloc[0][:150], "...\n")

print("--- CLEANED & TOKENIZED ---")
print(df['Cleaned_Content'].iloc[0][:15])

# ==========================================
# STEP 2: Temporal Distribution
# ==========================================

# 1. Group by the 'Date' column and count the number of rows (reports) per day
timeline_df = df.groupby('Date').size().reset_index(name='Total_Reports')

# 2. Ensure the dates are sorted chronologically
timeline_df = timeline_df.sort_values(by='Date')

# 3. Export this data to a JSON file for your Next.js frontend
timeline_df.to_json(OUTPUT_FILE_PATH + 'timeline_data.json', orient='records')

print("\n--- STEP 2: TEMPORAL DISTRIBUTION ---")
print("Successfully exported 'timeline_data.json'!")
print("Here is a preview of the daily counts:")
print(timeline_df.head())

# ==========================================
# STEP 3, 4, & 5: Filter Subset & Compare Timelines
# ==========================================

# 1. Define your threat-related keywords (you can adjust these later!)
keywords = {'threat', 'terrorism', 'terrorist', 'dead', 'attack', 'explosion', 'bomb', 'explosive', 'network', 'dread'}

# 2. Function to check if any of the keywords exist in the cleaned tokens
def contains_keywords(tokens):
    # Using python sets makes finding overlapping words extremely fast
    return bool(set(tokens) & keywords)

# 3. Create a new dataframe containing ONLY the relevant reports
filtered_df = df[df['Cleaned_Content'].apply(contains_keywords)]

print("\n--- STEP 3: FILTERING DATASET ---")
print(f"Reduced dataset from {len(df)} total reports to {len(filtered_df)} relevant reports.")

# 4. Group the FILTERED data by date to see the relevant reporting density
filtered_timeline = filtered_df.groupby('Date').size().reset_index(name='Filtered_Reports')

# 5. Merge this filtered count back into our main timeline from Step 2
# We use a 'left' merge and fillna(0) to put a 0 on days where there were no threat reports
timeline_df = pd.merge(timeline_df, filtered_timeline, on='Date', how='left').fillna(0)
timeline_df['Filtered_Reports'] = timeline_df['Filtered_Reports'].astype(int)

# Export the updated data to JSON for your Next.js frontend
timeline_df.to_json(OUTPUT_FILE_PATH +'timeline_data.json', orient='records')

print("\n--- STEP 4 & 5: COMPARING TEMPORAL DISTRIBUTIONS ---")
print("Updated 'timeline_data.json' with filtered counts!")
print(timeline_df.head())

# ==========================================
# STEP 6: Topic Modelling (LDA)
# ==========================================

print("\n--- STEP 6: TOPIC MODELLING ---")

# 1. Scikit-learn expects standard strings, not lists of tokens. 
# So, we join our cleaned tokens back into single strings.
filtered_df = filtered_df.copy() # Avoid SettingWithCopyWarning
filtered_df['Joined_Content'] = filtered_df['Cleaned_Content'].apply(lambda tokens: ' '.join(tokens))

# 2. Create the Document-Term Matrix
# We use CountVectorizer (standard for LDA) and ignore words that appear in >90% of documents
# or in less than 2 documents.
vectorizer = CountVectorizer(max_df=0.9, min_df=2)
dtm = vectorizer.fit_transform(filtered_df['Joined_Content'])

# 3. Build the LDA Topic Model
# Let's tell the model to find 3 main topics. You can adjust 'n_components' later!
num_topics = 3
lda_model = LatentDirichletAllocation(n_components=num_topics, random_state=42)
lda_model.fit(dtm)

# 4. Extract the top words for each topic to send to Next.js
feature_names = vectorizer.get_feature_names_out()
topics_data = []

# Loop through each topic to grab the top 15 words and their "importance" weights
for topic_idx, topic in enumerate(lda_model.components_):
    # Get the indices of the top 15 words
    top_word_indices = topic.argsort()[:-16:-1]
    
    # Format them exactly how libraries like `react-wordcloud` expect: { text: "word", value: 10.5 }
    topic_words = [
        {"text": feature_names[i], "value": round(topic[i], 2)} 
        for i in top_word_indices
    ]
    
    topics_data.append({
        "topic_id": topic_idx + 1,
        "top_words": topic_words
    })

# 5. Export to a JSON file for your frontend word cloud
with open(OUTPUT_FILE_PATH + 'topics_data.json', 'w') as f:
    json.dump(topics_data, f, indent=4)

print(f"Successfully generated {num_topics} topics and exported to 'topics_data.json'!")

# Print a quick preview in the terminal
for t in topics_data:
    words_only = [w['text'] for w in t['top_words'][:5]]
    print(f"Topic {t['topic_id']}: {', '.join(words_only)}")

# ==========================================
# STEP 7: Topic Temporal Distribution
# ==========================================

print("\n--- STEP 7: TOPIC TEMPORAL DISTRIBUTION ---")

# 1. Transform the document-term matrix to get the topic probabilities for each article
doc_topic_dist = lda_model.transform(dtm)

# 2. Find the dominant topic for each document 
# (argmax finds the index of the highest probability. We add 1 so topics are 1, 2, 3)
filtered_df['Dominant_Topic'] = doc_topic_dist.argmax(axis=1) + 1

# 3. Group by Date and Dominant_Topic to see how many articles per topic were published each day
topic_timeline = filtered_df.groupby(['Date', 'Dominant_Topic']).size().unstack(fill_value=0)

# 4. Rename the columns to be frontend-friendly (e.g., 'Topic_1', 'Topic_2')
topic_timeline.columns = [f'Topic_{col}' for col in topic_timeline.columns]

# 5. Merge these topic counts back into our main timeline
timeline_df = pd.merge(timeline_df, topic_timeline, on='Date', how='left').fillna(0)

# 6. Ensure the new topic columns are integers
for col in topic_timeline.columns:
    timeline_df[col] = timeline_df[col].astype(int)

# Export the final, comprehensive timeline data to JSON
timeline_df.to_json(OUTPUT_FILE_PATH +'timeline_data.json', orient='records')

print("Successfully merged topic distributions into 'timeline_data.json'!")
print(timeline_df.head())