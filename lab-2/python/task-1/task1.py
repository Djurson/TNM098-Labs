import cv2
import numpy as np
import glob
import os
import matplotlib.pyplot as plt
from scipy.spatial import distance


def extract_features(img_path):
    img = cv2.imread(img_path)
    if img is None: return None
    
    img = cv2.resize(img, (256, 256))
    
    # Global Color Histogram (B, G, R) for opencv
    hist = cv2.calcHist([img], [0, 1, 2], None, [8, 8, 8], [0, 256, 0, 256, 0, 256])
    hist_feat = cv2.normalize(hist, hist).flatten()
    
    # Spatial Color Distribution (Grid-based)
    # Captures distribution around several points by looking at a 8x8 grid
    small_img = cv2.resize(img, (8, 8)) / 255.0

    # Extract the 4 center squares and take average to get 3 values [Avg_Blue, Avg_Green, Avg_Red]
    center_avg_color = np.mean(small_img[3:5, 3:5, :], axis=(0, 1))
    
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)

    # Luminance Distribution of the 8x8 grid
    lum_dist = cv2.resize(gray, (8, 8)).flatten() / 255.0


    # Edge Detection
    # Captures "Edge positions and orientations"
    edges = cv2.Canny(gray, 100, 200)
    edge_feat = cv2.resize(edges, (16, 16)).flatten() / 255.0
    
    # Final combined vector
    return np.hstack([
        hist_feat,           # Color Content
        small_img.flatten(), # Color Distribution
        center_avg_color,    # Central Point Color Distribution
        lum_dist,            # Luminance Distribution
        edge_feat            # Edges
    ])

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

# Sort by distance (index 0 is the image itself, we skip it)
ranked_indices = np.argsort(distances_to_target)

def visualize_results(dist_matrix, filenames, target_idx, ranked_indices):
    # Create Heatmap
    fig, ax = plt.subplots(figsize=(12, 10))
    im = ax.imshow(dist_matrix, cmap='viridis', interpolation='nearest')
    
    plt.colorbar(im, label='Euclidean Distance')
    
    # Add labels to the axes
    ax.set_xticks(np.arange(len(filenames)))
    ax.set_yticks(np.arange(len(filenames)))
    ax.set_xticklabels(filenames, rotation=45, ha='right')
    ax.set_yticklabels(filenames)
    
    # --- ADDING THE NUMBERS ---
    # Loop over data dimensions and create text annotations.
    # We use a threshold to change text color for better visibility on dark/light cells.
    threshold = dist_matrix.max() / 2.
    for i in range(len(filenames)):
        for j in range(len(filenames)):
            color = "white" if dist_matrix[i, j] < threshold else "black"
            ax.text(j, i, f"{dist_matrix[i, j]:.2f}",
                    ha="center", va="center", color=color, fontsize=8)

    ax.set_title("12x12 Image Distance Matrix with Annotations")
    fig.tight_layout()
    plt.show()

print(f"\n--- Ranking for target image: {filenames[target_idx]} ---")
for rank, idx in enumerate(ranked_indices[1:], 1):
    print(f"{rank}. {filenames[idx]} (Distance: {distances_to_target[idx]:.4f})")

# CALL VISUALIZATION FUNCTION
visualize_results(dist_matrix, filenames, target_idx, ranked_indices)