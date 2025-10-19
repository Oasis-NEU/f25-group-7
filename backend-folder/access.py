from supabase import create_client
import pandas as pd
from datetime import datetime


pd.set_option('display.max_columns', None)
pd.set_option('display.max_rows', None)
pd.set_option('display.max_colwidth', None)
pd.set_option('display.width', None)

SUPABASE_URL = "https://rxxcpxytbsziedhpztcy.supabase.co"
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ4eGNweHl0YnN6aWVkaHB6dGN5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA1NTMzMTcsImV4cCI6MjA3NjEyOTMxN30.5GKOB_m8enpNens2id_tcQhwLqNSZyvl1ICx78AWFUU"

supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

today = datetime.now().strftime('%Y-%m-%d')

print(f"Fetching menu for: {today}")

response = supabase.table('menu_items').select('*') .eq('date', today).execute()

df = pd.DataFrame(response.data)
print(df)
#df.to_csv('menu.csv', index=False)
