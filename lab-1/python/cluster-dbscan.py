import pandas as pd
from sklearn.cluster import DBSCAN

# Load data and extract coordinates
df = pd.read_csv('EyeTrack-raw.tsv', sep='\t')
df = df.loc[:, ~df.columns.str.contains('^Unnamed')]
coords = df[['GazePointX(px)', 'GazePointY(px)']].fillna(0)

# Run DBSCAN
db = DBSCAN(eps=40, min_samples=5)
df['ClusterLabel'] = db.fit_predict(coords)

df['ClusterLabel'] = df['ClusterLabel'] + 2 # So that the labels are all possitive

# Save the resulting file
df.to_csv('../public/data/EyeTrack-clustered.tsv', sep='\t', index=False)