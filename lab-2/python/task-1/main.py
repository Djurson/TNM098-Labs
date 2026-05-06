import os
import glob
from PIL import Image

# Dictionary to hold the feature vector for each image
feature_vectors = {}

# Path to your folder (adjust if your script is in a different directory)
folder_path = '*.jpg'

# 1. Loop through all .jpg images in the directory
for img_path in glob.glob(folder_path):
    try:
        # Open and ensure the image is in RGB format
        img = Image.open(img_path).convert('RGB')
        
        # 2. Extract the feature vector
        # The histogram() method returns a flat list of 768 integers 
        # representing the color distribution (R, G, and B channels).
        vector = img.histogram()
        
        # Extract just the filename (e.g., '01.jpg') to use as a key
        filename = os.path.basename(img_path)
        
        # Store the vector
        feature_vectors[filename] = vector
        
        print(f"Successfully processed {filename} | Vector length: {len(vector)}")
        
    except Exception as e:
        print(f"Error processing {img_path}: {e}")

# Example: Print the first 10 values of the feature vector for '01.jpg'
if '01.jpg' in feature_vectors:
    print("\nSample vector for 01.jpg (First 10 Red channel bins):")
    print(feature_vectors['01.jpg'][:10])