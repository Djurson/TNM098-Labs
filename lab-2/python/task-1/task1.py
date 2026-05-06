import cv2
import numpy as np
import glob
import os
from scipy.spatial import distance

def extract_features(img_path):
    img = cv2.imread(img_path)
    if img is None: return None
    
    img = cv2.resize(img, (256, 256))
    
    # Global Color Histogram (B, G, R) for opencv
    hist = cv2.calcHist([img], [0, 1, 2], None, [8, 8, 8], [0, 256, 0, 256, 0, 256])
    hist_feat = cv2.normalize(hist, hist).flatten()
    
    # Spatial Color Distribution (Grid-based)
    # Captures distribution around several points by looking at a 4x4 grid
    small_img = cv2.resize(img, (4, 4)).flatten() / 255.0
    
    # Edges (Canny Edge Detection)
    # Captures "Edge positions and orientations"
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    edges = cv2.Canny(gray, 100, 200)
    edge_feat = cv2.resize(edges, (16, 16)).flatten() / 255.0
    
    # Combine into one feature vector
    return np.hstack([hist_feat, small_img, edge_feat])

# Process all images
image_files = sorted(glob.glob("*.jpg"))[:12]
features_list = []
filenames = []

for path in image_files:
    feat = extract_features(path)
    if feat is not None:
        features_list.append(feat)
        filenames.append(os.path.basename(path))

# Convert to numpy array for math operations
features_matrix = np.array(features_list)

# Compute 12x12 Distance Matrix (Euclidean Distance)
# dist_matrix[i][j] is the distance between image i and image j
dist_matrix = distance.cdist(features_matrix, features_matrix, 'euclidean')

# Rank images
target_idx = 0
distances_to_target = dist_matrix[target_idx]

# Sort by distance (index 0 will be the image itself, so we skip it)
ranked_indices = np.argsort(distances_to_target)

print(f"--- Distance Matrix (12x12) ---\n")
print(dist_matrix)

print(f"\n--- Ranking for target image: {filenames[target_idx]} ---")
for rank, idx in enumerate(ranked_indices[1:], 1):
    print(f"{rank}. {filenames[idx]} (Distance: {distances_to_target[idx]:.4f})")