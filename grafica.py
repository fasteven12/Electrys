import matplotlib.pyplot as plt 
import numpy as np
import pandas as pd

data=pd.read_csv('Bases de datos\08 wind-generation.csv')

df=pd.DataFrame(data)

df.plot()
plt.show()