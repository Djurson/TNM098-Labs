import pandas as pd
import numpy as np
from sklearn.cluster import DBSCAN
import json


def process_and_bin_data():
    # Load data and extract coordinates
    df = pd.read_csv('EyeTrack-raw.tsv', sep='\t')
    df = df.loc[:, ~df.columns.str.contains('^Unnamed')]

    coords = df[['GazePointX(px)', 'GazePointY(px)']].fillna(0)

    # 1. DBSCAN SETTINGS
    db = DBSCAN(eps=25, min_samples=4000)
    
    # 2. FIT WITH SAMPLE WEIGHTS
    db.fit(coords, sample_weight=df['GazeEventDuration(mS)'])
    df['cluster'] = db.labels_

    # 3. Calculate centers and format them into the new "clusters" structure
    centers_df = df[df['cluster'] != -1].groupby('cluster')[['GazePointX(px)', 'GazePointY(px)']].mean().sort_index()
    
    clusters_info = []
    for cluster_id, row in centers_df.iterrows():        
        clusters_info.append({
            "label": int(cluster_id),
            "center": {
                "x": float(row['GazePointX(px)']),
                "y": float(row['GazePointY(px)'])
            }
        })

    bin_size = 15000 
    df['time_bin'] = (df['RecordingTimestamp'] // bin_size) * bin_size

    # 5. Calculate frequency
    freq = df.groupby(['time_bin', 'cluster']).size().unstack(fill_value=0).reset_index()
    freq.columns = [str(col) if col != 'time_bin' else col for col in freq.columns]

    # 6. Map the points
    points = []
    for idx, row in df.iterrows():
        points.append({
            "timeStamp": int(row['RecordingTimestamp']),
            "fixationIndex": int(row['FixationIndex']),
            "gazeDuration": int(row['GazeEventDuration(mS)']),
            "gazePointIndex": int(row.get('GazePointIndex', idx)), 
            "cluster": int(row['cluster']),
            "position": {
                "x": float(row['GazePointX(px)']),
                "y": float(row['GazePointY(px)'])
            }
        })

    # 7. Construct the final dictionary using "clusters" instead of "centers"
    result = {
        "clusters": clusters_info,
        "points": points,
        "frequency": freq.to_dict(orient='records'),
        "maxTime": int(df['RecordingTimestamp'].max())
    }

    # Save the resulting file
    with open('../public/data.json', 'w') as f:
        json.dump(result, f, indent=2)
        
    print("DBSCAN clustering complete. Saved to ../public/data.json")

if __name__ == '__main__':
    process_and_bin_data()