import pandas as pd
import numpy as np
from sklearn.cluster import KMeans
import json

def process_and_bin_data():
    df = pd.read_csv('EyeTrack-raw.tsv', sep='\t')
    
    # 1. Clustering with your 6 manual seeds
    manual_centers = np.array([            [415, 785],
        [1249, 786],
        [1428, 785],
        [286, 233],
        [444, 228],
        [824, 240]])
    kmeans = KMeans(n_clusters=6, init=manual_centers, n_init=1)
    df['cluster'] = kmeans.fit_predict(df[['GazePointX(px)', 'GazePointY(px)']])

    # Bin into x(s) intervals
    bin_size = 15000 
    df['time_bin'] = (df['RecordingTimestamp'] // bin_size) * bin_size

    # 3. Calculate frequency (how many times each ROI was visited in each bin)
    freq = df.groupby(['time_bin', 'cluster']).size().unstack(fill_value=0).reset_index()

    result = {
        "centers": kmeans.cluster_centers_.tolist(),
        "points": df[['GazePointX(px)', 'GazePointY(px)', 'RecordingTimestamp', 'cluster']].to_dict(orient='records'),
        "frequency": freq.to_dict(orient='records'),
        "maxTime": int(df['RecordingTimestamp'].max())
    }
    
    with open('../public/clusters.json', 'w') as f:
        json.dump(result, f)

if __name__ == "__main__":
    process_and_bin_data()