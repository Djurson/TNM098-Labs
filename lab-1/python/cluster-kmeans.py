import pandas as pd
import numpy as np
from sklearn.cluster import KMeans
import json

def load_and_subset_data(file_path, n_points=744):
    """
    Handles loading the data and selecting the 'Time Slice'.
    Answers: 'Which regions are only used for part of the analysis procedure?'
    """
    df = pd.read_csv(file_path, sep='\t')
    
    # Select the columns we need for the lab (including Time and Duration)
    # We use .head(n_points) to control the temporal window
    subset = df.head(n_points)[['GazePointX(px)', 'GazePointY(px)', 'RecordingTimestamp', 'GazeEventDuration(mS)']]
    
    return subset

def cluster_data_manually(df, manual_centers):
    """
    Performs clustering based on user-defined AOIs.
    Answers: 'How many regions can be identified?'
    """
    clustering_data = df[['GazePointX(px)', 'GazePointY(px)']]
    
    kmeans = KMeans(
        n_clusters=len(manual_centers), 
        init=np.array(manual_centers), 
        n_init=1
    )

    df_result = df.copy()
    df_result['cluster'] = kmeans.fit_predict(clustering_data)
    
    return kmeans.cluster_centers_.tolist(), df_result

def export_to_json(centers, df_result, output_path):
    """Saves the data for your React/Next.js frontend."""
    result = {
        "centers": centers,
        "points": df_result.to_dict(orient='records')
    }
    with open(output_path, 'w') as f:
        json.dump(result, f)

# --- Execution ---
if __name__ == "__main__":
    data_subset = load_and_subset_data('../EyeTrack-raw.tsv', n_points=400)
    
    my_aois = [
        [500, 250],  # Top-left region
        [800, 700],  # Bottom-right region
        [150, 100]   # Header/Menu region
    ]
    
    final_centers, processed_df = cluster_data_manually(data_subset, my_aois)
    
    export_to_json(final_centers, processed_df, '../public/clusters.json')