import pandas as pd
import numpy as np
from sklearn.cluster import DBSCAN
import json

def process_and_bin_data():
    # Load data and extract coordinates
    df = pd.read_csv('EyeTrack-raw.tsv', sep='\t')
    df = df.loc[:, ~df.columns.str.contains('^Unnamed')]

    coords = df[['GazePointX(px)', 'GazePointY(px)']].fillna(0)

    # 1. NEW DBSCAN SETTINGS
    # eps: 30 pixels radius
    # min_samples: 1500 milliseconds (1.5 seconds) of total cumulative gaze required
    db = DBSCAN(eps=20, min_samples=3000)
    
    # 2. FIT WITH SAMPLE WEIGHTS
    # We pass the duration column as the weight. We use .fit() and extract .labels_
    db.fit(coords, sample_weight=df['GazeEventDuration(mS)'])
    df['cluster'] = db.labels_

    # 3. Calculate centers (ignoring the noise points: cluster -1)
    centers_df = df[df['cluster'] != -1].groupby('cluster')[['GazePointX(px)', 'GazePointY(px)']].mean().sort_index()
    centers = [
        {"x": float(row['GazePointX(px)']), "y": float(row['GazePointY(px)'])} 
        for _, row in centers_df.iterrows()
    ]

    # 4. Bin into 15s intervals
    bin_size = 15000 
    df['time_bin'] = (df['RecordingTimestamp'] // bin_size) * bin_size

    # 5. Calculate frequency (how many times each ROI was visited in each bin)
    freq = df.groupby(['time_bin', 'cluster']).size().unstack(fill_value=0).reset_index()
    
    # Convert cluster column headers to strings so JSON serializes them as keys properly
    freq.columns = [str(col) if col != 'time_bin' else col for col in freq.columns]

    # 6. Map the points to perfectly match EyeTrackDataPoint[] type
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

    # 7. Construct the final dictionary matching FullData type
    result = {
        "centers": centers,
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