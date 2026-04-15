import pandas as pd
from sklearn.cluster import DBSCAN

# 1. Load the provided TSV file
df = pd.read_csv('EyeTrack-raw.tsv', sep='\t')

# Clean up any trailing empty columns caused by the raw format
df = df.loc[:, ~df.columns.str.contains('^Unnamed')]

# 2. Extract coordinates
coords = df[['GazePointX(px)', 'GazePointY(px)']].fillna(0)

# 3. Apply DBSCAN clustering
# eps=40 pixels radius, min_samples=5 points to make a cluster
db = DBSCAN(eps=40, min_samples=5)
df['ClusterLabel'] = db.fit_predict(coords)

# 4. Write out the clustered data to a new TSV file
df.to_csv('../public/data/EyeTrack-clustered.tsv', sep='\t', index=False)