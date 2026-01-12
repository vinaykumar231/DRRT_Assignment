from fastapi import APIRouter, HTTPException, Depends, Query, Body, File, UploadFile
from fastapi.responses import FileResponse, JSONResponse, StreamingResponse
from typing import List, Optional, Dict, Any
import pandas as pd
import numpy as np
from datetime import datetime, timedelta
import io
import json
import logging
import traceback
import uuid
import tempfile
import os

from api.calculator import SettlementCalculator, SettlementType, Transaction, TransactionType


calculations_store = {}

router = APIRouter()
logger = logging.getLogger(__name__)


@router.post("/calculate/single")
async def calculate_single_loss(
    settlement_type: SettlementType = Body(..., description="Settlement type"),
    purchase_date: str = Body(..., description="Purchase date (ISO format or YYYY-MM-DD)"),
    purchase_price: float = Body(..., gt=0, description="Purchase price per share"),
    sale_date: Optional[str] = Body(None, description="Sale date (ISO format or YYYY-MM-DD)"),
    sale_price: Optional[float] = Body(None, description="Sale price per share"),
    quantity: float = Body(1.0, gt=0, description="Number of shares"),
    is_beginning_holdings: bool = Body(False, description="Whether this is beginning holdings")
):
    """Calculate recognized loss for a single purchase/sale pair"""
    try:
        logger.info(f"Single calculation for {settlement_type.value}")
        
        # Create calculator
        calculator = SettlementCalculator(settlement_type.value)
        
        # Parse dates
        from dateutil import parser
        
        try:
            purchase_date_obj = parser.parse(purchase_date)
        except:
            raise HTTPException(status_code=400, detail=f"Invalid purchase date format: {purchase_date}")
        
        sale_date_obj = None
        if sale_date:
            try:
                sale_date_obj = parser.parse(sale_date)
            except:
                raise HTTPException(status_code=400, detail=f"Invalid sale date format: {sale_date}")
        
        # Calculate loss per share
        start_time = datetime.now()
        
        # For beginning holdings, use class start date and zero price
        if is_beginning_holdings:
            calc_purchase_date = calculator.class_start
            calc_purchase_price = 0.0
        else:
            calc_purchase_date = purchase_date_obj
            calc_purchase_price = purchase_price
        
        result = calculator.calculate_recognized_loss_per_share(
            purchase_date=calc_purchase_date,
            purchase_price=calc_purchase_price,
            sale_date=sale_date_obj,
            sale_price=sale_price
        )
        
        processing_time = (datetime.now() - start_time).total_seconds() * 1000
        
        # Calculate total loss
        total_loss = result['recognized_loss'] * quantity
        
        calculation_id = f"single_{datetime.now().timestamp()}_{uuid.uuid4().hex[:8]}"
        calculations_store[calculation_id] = {
            "type": "single",
            "result": result,
            "parameters": {
                "settlement_type": settlement_type.value,
                "purchase_date": purchase_date,
                "purchase_price": purchase_price,
                "sale_date": sale_date,
                "sale_price": sale_price,
                "quantity": quantity,
                "is_beginning_holdings": is_beginning_holdings
            },
            "timestamp": datetime.now().isoformat()
        }
        
        return {
            "calculation_id": calculation_id,
            "timestamp": datetime.now().isoformat(),
            "settlement_type": settlement_type.value,
            "input": {
                "purchase_date": purchase_date,
                "purchase_price": purchase_price,
                "sale_date": sale_date,
                "sale_price": sale_price,
                "quantity": quantity,
                "is_beginning_holdings": is_beginning_holdings
            },
            "result": {
                "recognized_loss_per_share": round(result['recognized_loss'], 4),
                "total_recognized_loss": round(total_loss, 4),
                "rule_applied": result['rule_applied'],
                "rule_code": result['rule_code'],
                "details": result['details']
            },
            "processing_time_ms": round(processing_time, 2)
        }
        
    except Exception as e:
        logger.error(f"Single calculation error: {str(e)}\n{traceback.format_exc()}")
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/upload")
async def upload_transactions(
    file: UploadFile = File(...),
    settlement_type: str = Query(..., description="Settlement type (TWITTER or KRAFT_HEINZ)"),
    calculate_now: bool = Query(False, description="Calculate losses immediately after upload")
):
    """Upload transactions via CSV or Excel with optional immediate calculation"""
    try:
        logger.info(f"Uploading file {file.filename} for {settlement_type}")
        
        # Validate file extension
        file_ext = file.filename.lower()
        if not (file_ext.endswith('.csv') or file_ext.endswith('.xlsx') or file_ext.endswith('.xls')):
            raise HTTPException(
                status_code=400, 
                detail="Unsupported file format. Please upload CSV (.csv) or Excel (.xlsx, .xls) files only."
            )
        
        # Read file based on extension
        file_content = await file.read()
        
        if file.filename.lower().endswith('.csv'):
            df = pd.read_csv(io.BytesIO(file_content))
        elif file.filename.lower().endswith(('.xlsx', '.xls')):
            df = pd.read_excel(io.BytesIO(file_content))
        
        # Log file structure for debugging
        logger.info(f"File columns: {df.columns.tolist()}")
        logger.info(f"File shape: {df.shape}")
        
        # Create calculator
        calculator = SettlementCalculator(settlement_type)
        
        # Load transactions using the calculator's method
        load_result = calculator.load_transactions_from_dataframe(df)
        
        if not load_result['success']:
            raise HTTPException(
                status_code=400,
                detail=f"Failed to load transactions: {load_result.get('error', 'Unknown error')}"
            )
        
        # Store upload
        upload_id = f"upload_{datetime.now().timestamp()}_{uuid.uuid4().hex[:8]}"
        store_data = {
            "type": "upload",
            "filename": file.filename,
            "settlement_type": settlement_type,
            "transaction_count": load_result['transactions_loaded'],
            "errors": load_result.get('errors'),
            "error_count": load_result.get('error_count', 0),
            "calculator": calculator,
            "timestamp": datetime.now().isoformat()
        }
        
        calculations_store[upload_id] = store_data
        
        # Get transaction preview
        transactions_preview = []
        for i, txn in enumerate(calculator.transactions[:5]):
            transactions_preview.append({
                "id": txn.id,
                "date": txn.date.isoformat() if txn.date else None,
                "quantity": txn.quantity,
                "price": txn.price,
                "type": txn.type.value,
                "entity": txn.entity,
                "fund_name": txn.fund_name
            })
        
        # Prepare base response
        response = {
            "upload_id": upload_id,
            "filename": file.filename,
            "settlement_type": settlement_type,
            "upload_success": True,
            "statistics": {
                "transaction_count": load_result['transactions_loaded'],
                "rows_processed": load_result['total_rows'],
                "error_count": load_result.get('error_count', 0),
                "success_rate": f"{(load_result['transactions_loaded'] / load_result['total_rows'] * 100):.1f}%" if load_result['total_rows'] > 0 else "0%"
            },
            "preview": transactions_preview,
            "timestamp": datetime.now().isoformat()
        }
        
        # If calculate_now is True, calculate losses immediately
        if calculate_now and load_result['transactions_loaded'] > 0:
            response["calculation_performed"] = True
            
            try:
                calc_start_time = datetime.now()
                calculation_result = calculator.calculate_all_losses()
                calc_processing_time = (datetime.now() - calc_start_time).total_seconds() * 1000
                
                if calculation_result['success']:
                    calculation_id = f"calc_{datetime.now().timestamp()}_{uuid.uuid4().hex[:8]}"
                    
                    # Get matches as DataFrame
                    matches_df = calculator.get_matches_dataframe()
                    
                    # Store calculation
                    calculations_store[calculation_id] = {
                        "type": "batch",
                        "upload_id": upload_id,
                        "result": calculation_result,
                        "matches_df": matches_df,
                        "timestamp": datetime.now().isoformat()
                    }
                    
                    store_data['calculation_id'] = calculation_id
                    
                    # Prepare calculation summary
                    calculation_summary = {
                        "calculation_id": calculation_id,
                        "calculation_success": True,
                        "processing_time_ms": round(calc_processing_time, 2),
                        "total_recognized_loss": calculation_result.get('total_recognized_loss', 0),
                        "total_quantity": calculation_result.get('total_quantity', 0),
                        "matches_count": calculation_result.get('matches_count', 0)
                    }
                    
                    # Add entity and fund summaries if available
                    if 'entity_summary' in calculation_result:
                        calculation_summary["entity_summary"] = calculation_result['entity_summary']
                    if 'fund_summary' in calculation_result:
                        calculation_summary["fund_summary"] = calculation_result['fund_summary']
                    
                    # Add detailed statistics if we have matches
                    if matches_df is not None and not matches_df.empty:
                        # Calculate per share statistics
                        if matches_df['quantity'].sum() > 0:
                            avg_loss_per_share = matches_df['recognized_loss'].sum() / matches_df['quantity'].sum()
                            calculation_summary["average_loss_per_share"] = round(avg_loss_per_share, 4)
                        
                        # Rule distribution
                        rule_counts = matches_df['rule_code'].value_counts().to_dict()
                        calculation_summary["rule_distribution"] = rule_counts
                    
                    response["calculation"] = calculation_summary
                    
                else:
                    response["calculation_performed"] = False
                    response["calculation_error"] = calculation_result.get('error', 'Calculation failed')
                    
            except Exception as calc_error:
                logger.error(f"Immediate calculation error: {str(calc_error)}")
                response["calculation_performed"] = False
                response["calculation_error"] = str(calc_error)
        else:
            response["calculation_performed"] = False
        
        # Add errors if any
        if load_result.get('errors'):
            response["statistics"]["sample_errors"] = load_result.get('errors')[:5]
        
        return response
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Upload error: {str(e)}\n{traceback.format_exc()}")
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/calculate/batch")
async def calculate_batch_losses(
    upload_id: str = Body(..., description="Upload ID from previous upload"),
    match_method: str = Body("FIFO", description="Matching method (FIFO, LIFO, SPECIFIC_ID)"),
    return_detailed: bool = Body(False, description="Return detailed match information")
):
    """Calculate losses for uploaded batch"""
    try:
        logger.info(f"Batch calculation for upload_id: {upload_id}")
        
        # Retrieve upload
        upload_data = calculations_store.get(upload_id)
        if not upload_data or upload_data['type'] != 'upload':
            raise HTTPException(status_code=404, detail="Upload not found or invalid")
        
        calculator = upload_data['calculator']
        
        # Calculate all losses
        start_time = datetime.now()
        result = calculator.calculate_all_losses()
        processing_time = (datetime.now() - start_time).total_seconds() * 1000
        
        if not result['success']:
            raise HTTPException(
                status_code=400,
                detail=f"Calculation failed: {result.get('error', 'Unknown error')}"
            )
        
        # Get matches DataFrame
        matches_df = calculator.get_matches_dataframe()
        
        # Generate calculation ID
        calculation_id = f"batch_{datetime.now().timestamp()}_{uuid.uuid4().hex[:8]}"
        
        # Store results
        store_data = {
            "type": "batch",
            "upload_id": upload_id,
            "result": result,
            "matches_df": matches_df,
            "timestamp": datetime.now().isoformat()
        }
        
        calculations_store[calculation_id] = store_data
        
        # Update upload data with calculation reference
        upload_data['calculation_id'] = calculation_id
        
        # Prepare response
        response = {
            "calculation_id": calculation_id,
            "upload_id": upload_id,
            "settlement_type": upload_data['settlement_type'],
            "calculation_success": True,
            "processing_time_ms": round(processing_time, 2),
            "summary": {
                "total_recognized_loss": result['total_recognized_loss'],
                "total_quantity": result['total_quantity'],
                "matches_count": result['matches_count']
            }
        }
        
        # Add entity and fund summaries
        if 'entity_summary' in result:
            response["summary"]["entity_summary"] = result['entity_summary']
        if 'fund_summary' in result:
            response["summary"]["fund_summary"] = result['fund_summary']
        
        # Add detailed match information if requested
        if return_detailed and matches_df is not None and not matches_df.empty:
            # Convert matches to list of dictionaries
            matches_list = matches_df.to_dict('records')
            response["detailed_matches"] = {
                "count": len(matches_list),
                "matches": matches_list[:100]  # Limit to 100 matches for response size
            }
            
            # Add statistics
            if matches_df['quantity'].sum() > 0:
                avg_loss_per_share = matches_df['recognized_loss'].sum() / matches_df['quantity'].sum()
                response["summary"]["average_loss_per_share"] = round(avg_loss_per_share, 4)
            
            # Add rule distribution
            rule_dist = matches_df['rule_code'].value_counts().to_dict()
            response["summary"]["rule_distribution"] = rule_dist
        
        # Add download information
        response["download"] = {
            "available_formats": ["csv", "excel", "json"],
            "endpoint": "/api/download/results/{calculation_id}",
            "example": f"/api/download/results/{calculation_id}?format=csv"
        }
        
        # Add next steps
        response["next_steps"] = [
            {
                "action": "Download results",
                "description": "Download calculation results in various formats",
                "endpoint": f"/api/download/results/{calculation_id}"
            },
            {
                "action": "View calculation details",
                "description": "Get detailed information about this calculation",
                "endpoint": f"/api/calculations/{calculation_id}"
            }
        ]
        
        return response
        
    except Exception as e:
        logger.error(f"Batch calculation error: {str(e)}\n{traceback.format_exc()}")
        raise HTTPException(status_code=400, detail=str(e))


# Helper function to validate and process upload data
def process_transaction_file(file_content: bytes, filename: str) -> Dict[str, Any]:
    """Process uploaded transaction file and return structured data"""
    try:
        # Read file based on extension
        if filename.lower().endswith('.csv'):
            df = pd.read_csv(io.BytesIO(file_content))
        elif filename.lower().endswith(('.xlsx', '.xls')):
            df = pd.read_excel(io.BytesIO(file_content))
        else:
            return {
                "success": False,
                "error": "Unsupported file format. Use CSV or Excel."
            }
        
        # Validate required data
        if df.empty:
            return {
                "success": False,
                "error": "File is empty"
            }
        
        # Try to auto-detect column mappings
        column_mapping = detect_column_mapping(df.columns)
        
        # Create structured data
        transactions = []
        errors = []
        
        for idx, row in df.iterrows():
            try:
                transaction = parse_transaction_row(row, column_mapping, idx)
                if transaction:
                    transactions.append(transaction)
            except Exception as e:
                errors.append(f"Row {idx}: {str(e)}")
        
        return {
            "success": True,
            "transaction_count": len(transactions),
            "total_rows": len(df),
            "errors": errors if errors else None,
            "error_count": len(errors),
            "transactions": transactions,
            "column_mapping": column_mapping
        }
        
    except Exception as e:
        return {
            "success": False,
            "error": str(e)
        }


def detect_column_mapping(columns):
    """Auto-detect column names based on common patterns"""
    column_mapping = {}
    
    # Common column name variations
    patterns = {
        'date': ['trade_date', 'date', 'transaction_date', 'trade date', 'Trade Date'],
        'quantity': ['quantity', 'shares', 'qty', 'Quantity', 'Shares'],
        'price': ['price', 'price_per_share', 'price per share', 'Price', 'Price per Share'],
        'type': ['type', 'transaction_type', 'transaction type', 'Type', 'Transaction Type'],
        'fund': ['fund_name', 'fund', 'fund name', 'Fund Name', 'Fund'],
        'entity': ['entity', 'client', 'customer', 'Entity', 'Client']
    }
    
    for column in columns:
        col_lower = str(column).lower().replace(' ', '_').replace('-', '_')
        
        for key, patterns_list in patterns.items():
            for pattern in patterns_list:
                pattern_lower = pattern.lower().replace(' ', '_').replace('-', '_')
                if pattern_lower in col_lower or col_lower in pattern_lower:
                    column_mapping[key] = column
                    break
    
    return column_mapping


def parse_transaction_row(row, column_mapping, row_index):
    """Parse a single transaction row"""
    try:
        # Get values using column mapping
        date_str = row.get(column_mapping.get('date', ''))
        if pd.isna(date_str):
            return None
        
        # Parse transaction type
        type_str = str(row.get(column_mapping.get('type', ''), '')).lower()
        if 'beginning' in type_str or 'opening' in type_str or 'holding' in type_str:
            tx_type = 'BEGINNING_HOLDINGS'
        elif 'purchase' in type_str or 'buy' in type_str:
            tx_type = 'PURCHASE'
        elif 'sale' in type_str or 'sell' in type_str:
            tx_type = 'SALE'
        else:
            # Try to infer from quantity columns
            purchases = float(row.get('Purchases', 0))
            sales = float(row.get('Sales', 0))
            holdings = float(row.get('Holdings', 0))
            
            if purchases > 0:
                tx_type = 'PURCHASE'
            elif sales > 0:
                tx_type = 'SALE'
            elif holdings > 0:
                tx_type = 'BEGINNING_HOLDINGS'
            else:
                return None
        
        # Get quantity
        quantity = 0.0
        if tx_type == 'PURCHASE':
            quantity = float(row.get('Purchases', 0))
        elif tx_type == 'SALE':
            quantity = float(row.get('Sales', 0))
        elif tx_type == 'BEGINNING_HOLDINGS':
            quantity = float(row.get('Holdings', 0))
        
        if quantity <= 0:
            return None
        
        # Get price
        price = float(row.get(column_mapping.get('price', ''), 0))
        
        # Get entity and fund
        entity = str(row.get(column_mapping.get('entity', ''), f"Row_{row_index}"))
        fund_name = str(row.get(column_mapping.get('fund', ''), entity))
        
        # Create transaction dictionary
        transaction = {
            'id': f"row_{row_index}",
            'date': date_str,
            'quantity': quantity,
            'price': price,
            'type': tx_type,
            'entity': entity,
            'fund_name': fund_name
        }
        
        return transaction
        
    except Exception as e:
        raise Exception(f"Failed to parse row: {str(e)}")