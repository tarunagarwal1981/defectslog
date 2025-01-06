from pyspark.sql import DataFrame
import pandas as pd
from sqlalchemy import create_engine, text
import time
import urllib.parse
from datetime import datetime
import json
import os
from typing import Optional, Dict

def print_status(message: str):
    """Print status with timestamp"""
    print(f"[{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}] {message}")

def get_checkpoint_file(table_name: str) -> str:
    """Get the checkpoint file name for a table"""
    return f"{table_name}_checkpoint.json"

def save_checkpoint(table_name: str, rows_processed: int):
    """Save progress checkpoint"""
    checkpoint_data = {
        "rows_processed": rows_processed,
        "timestamp": datetime.now().isoformat()
    }
    with open(get_checkpoint_file(table_name), 'w') as f:
        json.dump(checkpoint_data, f)

def load_checkpoint(table_name: str) -> Optional[int]:
    """Load progress from checkpoint"""
    checkpoint_file = get_checkpoint_file(table_name)
    if os.path.exists(checkpoint_file):
        try:
            with open(checkpoint_file, 'r') as f:
                data = json.load(f)
                return data.get("rows_processed", 0)
        except:
            return 0
    return 0

def test_connection() -> str:
    """Test the database connection with different connection methods."""
    password = "5sSLogAzvsZquIoL"
    encoded_password = urllib.parse.quote_plus(password)
    
    configs = [
        {
            "name": "Transaction Pooler",
            "url": f"postgresql://postgres.aegejyftralxyklrinyn:{encoded_password}@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres"
        },
        {
            "name": "Session Pooler",
            "url": f"postgresql://postgres.aegejyftralxyklrinyn:{encoded_password}@aws-0-ap-southeast-1.pooler.supabase.com:5432/postgres"
        },
        {
            "name": "Direct Connection",
            "url": f"postgresql://postgres:{encoded_password}@db.aegejyftralxyklrinyn.supabase.co:5432/postgres"
        }
    ]
    
    for config in configs:
        print_status(f"Testing {config['name']}...")
        try:
            engine = create_engine(
                config['url'],
                pool_size=3,  # Reduced pool size
                max_overflow=5,
                pool_timeout=30,
                pool_recycle=1800,  # Recycle connections every 30 minutes
                connect_args={
                    "connect_timeout": 30,
                    "application_name": "databricks_transfer",
                    "client_encoding": "utf8",
                    "keepalives": 1,
                    "keepalives_idle": 30,
                    "keepalives_interval": 10,
                    "keepalives_count": 5
                }
            )
            with engine.connect() as conn:
                result = conn.execute(text("SELECT 1"))
                print_status(f"Success! Connected using {config['name']}")
                return config['url']
        except Exception as e:
            print_status(f"Connection failed for {config['name']}: {str(e)}")
            continue
    
    raise Exception("No connection methods worked!")

def convert_decimal_columns_to_float(spark_df: DataFrame) -> DataFrame:
    """Converts all DecimalType columns in a Spark DataFrame to FloatType."""
    for col_name, dtype in spark_df.dtypes:
        if dtype.startswith('decimal'):
            print_status(f"Converting column {col_name} from DecimalType to FloatType")
            spark_df = spark_df.withColumn(col_name, spark_df[col_name].cast("float"))
    return spark_df

def create_fresh_engine():
    """Create a fresh database engine"""
    return create_engine(
        supabase_url,
        pool_size=1,  # Single connection per engine
        max_overflow=0,
        pool_timeout=30,
        connect_args={
            "connect_timeout": 30,
            "application_name": "databricks_transfer",
            "client_encoding": "utf8",
            "keepalives": 1,
            "keepalives_idle": 30,
            "keepalives_interval": 10,
            "keepalives_count": 5
        }
    )

def push_chunk_with_retry(chunk: pd.DataFrame, table_name: str, chunk_num: int, total_chunks: int) -> Optional[int]:
    """Pushes a single chunk with retry logic using a fresh connection."""
    max_retries = 5
    for attempt in range(max_retries):
        try:
            # Create a fresh engine for each attempt
            engine = create_fresh_engine()
            with engine.begin() as conn:
                chunk.to_sql(
                    table_name,
                    conn,
                    if_exists='append',
                    index=False,
                    method='multi'
                )
            engine.dispose()  # Explicitly dispose of the engine
            return len(chunk)
        except Exception as e:
            if attempt == max_retries - 1:
                print_status(f"Failed to push chunk {chunk_num}/{total_chunks} after {max_retries} attempts: {str(e)}")
                return None
            backoff_time = min(30, (attempt + 1) * 5)
            print_status(f"Retry {attempt + 1} for chunk {chunk_num}/{total_chunks} after error: {str(e)}")
            print_status(f"Waiting {backoff_time} seconds before retry...")
            time.sleep(backoff_time)
            # Dispose of the failed engine
            try:
                engine.dispose()
            except:
                pass

def push_dataframe_to_supabase(dataframe: DataFrame, table_name: str, chunk_size: int = 100):  # Smaller chunks
    """Converts a Spark DataFrame to Pandas and pushes it to Supabase in chunks with resume capability."""
    try:
        dataframe = convert_decimal_columns_to_float(dataframe)
        print_status("Converting to pandas DataFrame...")
        pandas_df = dataframe.toPandas()
        total_rows = len(pandas_df)
        print_status(f"Total rows to transfer: {total_rows:,}")
        
        if pandas_df.empty:
            print_status("DataFrame is empty, nothing to transfer")
            return

        # Load checkpoint
        rows_processed = load_checkpoint(table_name)
        if rows_processed > 0:
            print_status(f"Resuming from checkpoint: {rows_processed:,} rows already processed")
        
        # Create table schema if starting fresh
        if rows_processed == 0:
            print_status("Creating table schema...")
            engine = create_fresh_engine()
            try:
                with engine.begin() as conn:
                    pandas_df.head(1).to_sql(
                        table_name,
                        conn,
                        if_exists='replace',
                        index=False
                    )
                print_status("Table schema created successfully")
            finally:
                engine.dispose()
        
        total_chunks = ((total_rows - rows_processed) + chunk_size - 1) // chunk_size
        print_status(f"Will transfer remaining {total_rows - rows_processed:,} rows in {total_chunks} chunks (chunk size: {chunk_size:,} rows)")
        
        start_time = time.time()
        checkpoint_interval = 5000  # More frequent checkpoints
        
        for i in range(rows_processed, total_rows, chunk_size):
            chunk = pandas_df.iloc[i:i + chunk_size]
            current_chunk = ((i - rows_processed) // chunk_size) + 1
            
            # Display progress before attempting chunk
            displayHTML(f"""
            <div style="padding: 10px; background-color: #f0f0f0; border-radius: 5px;">
                <h4>Transfer Progress:</h4>
                <p>Chunk {current_chunk}/{total_chunks}</p>
                <p>Rows: {i:,}/{total_rows:,}</p>
                <p>Progress: {(i/total_rows*100):.1f}%</p>
            </div>
            """)
            
            chunk_rows = push_chunk_with_retry(chunk, table_name, current_chunk, total_chunks)
            if chunk_rows is None:
                print_status(f"Failed at row {i:,}. You can resume from this point later.")
                save_checkpoint(table_name, i)
                raise Exception(f"Failed to push chunk {current_chunk}")
            
            if i % checkpoint_interval == 0:
                save_checkpoint(table_name, i)
                print_status(f"Checkpoint saved at {i:,} rows")
            
            # Calculate speed and ETA
            elapsed = time.time() - start_time
            speed = (i - rows_processed + chunk_size) / elapsed if elapsed > 0 else 0
            remaining_rows = total_rows - i - chunk_size
            eta = remaining_rows / speed if speed > 0 else 0
            
            print_status(f"Speed: {speed:.1f} rows/sec, ETA: {eta/60:.1f} minutes")
        
        # Clear checkpoint after successful completion
        if os.path.exists(get_checkpoint_file(table_name)):
            os.remove(get_checkpoint_file(table_name))
        
        print_status(f"\nTransfer completed in {(time.time() - start_time)/60:.1f} minutes")
    
    except Exception as e:
        print_status(f"Error during data push: {str(e)}")
        raise

# Main execution
print_status(f"Starting transfers at {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")

try:
    print_status("Testing database connections...")
    supabase_url = test_connection()
    print_status(f"Using connection: {supabase_url}")
    
    tables = [
        {
            "query": "SELECT * FROM reporting_layer.digital_desk.sf_consumption_logs",
            "name": "sf_consumption_logs"
        }
    ]
    
    for table in tables:
        print_status(f"\nProcessing table: {table['name']}")
        print_status(f"Executing query: {table['query']}")
        
        try:
            spark_df = spark.sql(table['query'])
            row_count = spark_df.count()
            print_status(f"Retrieved {row_count:,} rows from source")
            push_dataframe_to_supabase(spark_df, table['name'])
            print_status(f"Successfully completed transfer of {table['name']}")
        except Exception as e:
            print_status(f"Error processing table {table['name']}: {str(e)}")
            print_status("Continuing with next table...")
            continue
    
    print_status(f"\nAll transfers completed at {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    
except Exception as e:
    print_status(f"\nError during transfer process: {str(e)}")
    raise
