// Global state
let currentSettlement = 'twitter';
let uploadedFile = null;
let manualTransactions = [];
let calculationResults = null;
let previewData = [];
let currentPage = 1;
const itemsPerPage = 10;
const API_URL = 'http://127.0.0.1:8000'; // Update this with your FastAPI URL

// DOM Elements
const startCalculationBtn = document.getElementById('startCalculationBtn');
const viewDocsBtn = document.getElementById('viewDocsBtn');
const twitterSettlement = document.getElementById('twitterSettlement');
const kraftSettlement = document.getElementById('kraftSettlement');
const uploadTabBtn = document.getElementById('uploadTabBtn');
const manualTabBtn = document.getElementById('manualTabBtn');
const uploadZone = document.getElementById('uploadZone');
const browseBtn = document.getElementById('browseBtn');
const fileInput = document.getElementById('fileInput');
const calculateBtn = document.getElementById('calculateBtn');
const addTransactionBtn = document.getElementById('addTransactionBtn');
const calculateManualBtn = document.getElementById('calculateManualBtn');
const tableBody = document.getElementById('tableBody');
const resultsSection = document.getElementById('resultsSection');
const resultsSummary = document.getElementById('resultsSummary');
const downloadResultsBtn = document.getElementById('downloadResultsBtn');
const newCalculationBtn = document.getElementById('newCalculationBtn');
const backToTopBtn = document.getElementById('backToTopBtn');

// Results tabs elements
const resultsTabBtn = document.getElementById('resultsTabBtn');
const previewTabBtn = document.getElementById('previewTabBtn');
const reportTabBtn = document.getElementById('reportTabBtn');
const statsTabBtn = document.getElementById('statsTabBtn');
const resultsTabContent = document.getElementById('resultsTabContent');
const previewTabContent = document.getElementById('previewTabContent');
const reportTabContent = document.getElementById('reportTabContent');
const statsTabContent = document.getElementById('statsTabContent');

// Data preview elements
const totalTransactions = document.getElementById('totalTransactions');
const previewRange = document.getElementById('previewRange');
const dataTableBody = document.getElementById('dataTableBody');
const tablePagination = document.getElementById('tablePagination');

// Statistics elements
const totalLossStat = document.getElementById('totalLossStat');
const transactionCount = document.getElementById('transactionCount');
const avgLossPerShare = document.getElementById('avgLossPerShare');
const successRate = document.getElementById('successRate');
const processingTime = document.getElementById('processingTime');
const clientChartBars = document.getElementById('clientChartBars');
const transactionPieChart = document.getElementById('transactionPieChart');
const detailedStatsBody = document.getElementById('detailedStatsBody');
const exportReportBtn = document.getElementById('exportReportBtn');

// Manual Calculator Elements
const manualPurchaseDate = document.getElementById('manualPurchaseDate');
const manualPurchasePrice = document.getElementById('manualPurchasePrice');
const manualSaleDate = document.getElementById('manualSaleDate');
const manualSalePrice = document.getElementById('manualSalePrice');
const manualQuantity = document.getElementById('manualQuantity');
const manualBeginningHoldings = document.getElementById('manualBeginningHoldings');
const manualCalculateBtn = document.getElementById('manualCalculateBtn');
const manualResultContainer = document.getElementById('manualResultContainer');
const manualResultGrid = document.getElementById('manualResultGrid');

// Initialize the application
document.addEventListener('DOMContentLoaded', () => {
    initializeEventListeners();
    setupDragAndDrop();
    initializeResultsTabs();
    initializeManualCalculator();
    checkAPIStatus();
});

// Event Listeners Setup
function initializeEventListeners() {
    // Hero section buttons
    startCalculationBtn.addEventListener('click', scrollToSettlementSection);
    viewDocsBtn.addEventListener('click', showDocumentation);
    
    // Settlement selection
    twitterSettlement.addEventListener('click', () => selectSettlement('twitter'));
    kraftSettlement.addEventListener('click', () => selectSettlement('kraft'));
    
    // Tab navigation
    uploadTabBtn.addEventListener('click', () => switchTab('upload'));
    manualTabBtn.addEventListener('click', () => switchTab('manual'));
    
    // File upload
    browseBtn.addEventListener('click', () => fileInput.click());
    fileInput.addEventListener('change', handleFileSelect);
    calculateBtn.addEventListener('click', calculateFromFile);
    
    // Manual entry (old batch transactions)
    addTransactionBtn.addEventListener('click', addManualTransaction);
    calculateManualBtn.addEventListener('click', calculateFromManual);
    
    // Results section
    downloadResultsBtn.addEventListener('click', downloadResults);
    newCalculationBtn.addEventListener('click', resetCalculator);
    exportReportBtn.addEventListener('click', exportDetailedReport);
    
    // Back to top
    backToTopBtn.addEventListener('click', scrollToTop);
    
    // Scroll handling
    window.addEventListener('scroll', handleScroll);
}

// Initialize results tabs
function initializeResultsTabs() {
    resultsTabBtn.addEventListener('click', () => switchResultsTab('results'));
    previewTabBtn.addEventListener('click', () => switchResultsTab('preview'));
    reportTabBtn.addEventListener('click', () => switchResultsTab('report'));
    statsTabBtn.addEventListener('click', () => switchResultsTab('stats'));
}

// Initialize manual calculator
function initializeManualCalculator() {
    // Set today's date as default for dates
    const today = new Date().toISOString().split('T')[0];
    manualSaleDate.value = today;
    manualPurchaseDate.value = today;
    
    // Add event listeners for manual calculator
    manualCalculateBtn.addEventListener('click', calculateManualLoss);
    manualBeginningHoldings.addEventListener('change', handleBeginningHoldingsChange);
}

// Handle beginning holdings checkbox
function handleBeginningHoldingsChange() {
    if (manualBeginningHoldings.checked) {
        manualPurchasePrice.disabled = true;
        manualPurchasePrice.value = '';
        manualPurchasePrice.placeholder = 'Auto-set to $0.00';
        manualPurchaseDate.disabled = true;
    } else {
        manualPurchasePrice.disabled = false;
        manualPurchasePrice.placeholder = 'Enter purchase price';
        manualPurchaseDate.disabled = false;
    }
}

// Check API status
async function checkAPIStatus() {
    try {
        const response = await fetch(`${API_URL}/docs`);
        if (response.ok) {
            console.log('FastAPI backend is running');
        }
    } catch (error) {
        console.warn('FastAPI backend may not be running:', error.message);
        showNotification('Note: FastAPI backend may not be running. Manual calculations will use simulated data.', 'warning');
    }
}

// Drag and drop setup
function setupDragAndDrop() {
    // Prevent default drag behaviors
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        uploadZone.addEventListener(eventName, preventDefaults, false);
        document.body.addEventListener(eventName, preventDefaults, false);
    });
    
    // Highlight drop zone when dragging over it
    ['dragenter', 'dragover'].forEach(eventName => {
        uploadZone.addEventListener(eventName, highlight, false);
    });
    
    ['dragleave', 'drop'].forEach(eventName => {
        uploadZone.addEventListener(eventName, unhighlight, false);
    });
    
    // Handle dropped files
    uploadZone.addEventListener('drop', handleDrop, false);
}

function preventDefaults(e) {
    e.preventDefault();
    e.stopPropagation();
}

function highlight() {
    uploadZone.classList.add('dragover');
}

function unhighlight() {
    uploadZone.classList.remove('dragover');
}

function handleDrop(e) {
    const dt = e.dataTransfer;
    const files = dt.files;
    handleFiles(files);
}

// Core Functions
function scrollToSettlementSection() {
    document.getElementById('settlementSection').scrollIntoView({ 
        behavior: 'smooth' 
    });
}

function showDocumentation() {
    alert('Documentation page would open here. This is a demo implementation.');
}

function selectSettlement(settlement) {
    currentSettlement = settlement;
    
    // Update UI
    document.querySelectorAll('.settlement-card').forEach(card => {
        card.classList.remove('selected');
    });
    
    if (settlement === 'twitter') {
        twitterSettlement.classList.add('selected');
    } else {
        kraftSettlement.classList.add('selected');
    }
    
    // Show notification
    showNotification(`Selected ${settlement === 'twitter' ? 'Twitter' : 'Kraft Heinz'} settlement`, 'success');
}

function switchTab(tabName) {
    // Update tab buttons
    document.querySelectorAll('.tab').forEach(tab => {
        tab.classList.remove('active');
    });
    
    if (tabName === 'upload') {
        uploadTabBtn.classList.add('active');
    } else {
        manualTabBtn.classList.add('active');
    }
    
    // Update tab content
    document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.remove('active');
    });
    
    document.getElementById(`${tabName}Tab`).classList.add('active');
}

function switchResultsTab(tabName) {
    // Update tab buttons
    document.querySelectorAll('.results-tabs .tab').forEach(tab => {
        tab.classList.remove('active');
    });
    
    document.getElementById(`${tabName}TabBtn`).classList.add('active');
    
    // Update tab content
    document.querySelectorAll('.results-tabs .tab-content').forEach(content => {
        content.classList.remove('active');
    });
    
    document.getElementById(`${tabName}TabContent`).classList.add('active');
}

function handleFileSelect(e) {
    const files = e.target.files;
    handleFiles(files);
}

function handleFiles(files) {
    if (files.length === 0) return;
    
    const file = files[0];
    const validTypes = ['.xlsx', '.xls', '.csv'];
    const fileExt = file.name.toLowerCase().slice(file.name.lastIndexOf('.'));
    
    if (!validTypes.includes(fileExt)) {
        showNotification('Please upload Excel (.xlsx, .xls) or CSV files only.', 'error');
        return;
    }
    
    uploadedFile = file;
    
    // Update UI
    uploadZone.innerHTML = `
        <div class="upload-icon">
            <i class="fas fa-file-excel" style="color: #10b981;"></i>
        </div>
        <h4>${file.name}</h4>
        <p>File uploaded successfully</p>
        <p>Size: ${(file.size / 1024).toFixed(2)} KB</p>
        <div class="upload-btn" id="changeFileBtn">
            <i class="fas fa-sync-alt"></i>
            Change File
        </div>
    `;
    
    // Add event listener to change file button
    const changeFileBtn = document.getElementById('changeFileBtn');
    changeFileBtn.addEventListener('click', () => {
        fileInput.click();
    });
    
    showNotification(`File "${file.name}" uploaded successfully`, 'success');
}

function calculateFromFile() {
    if (!uploadedFile) {
        showNotification('Please upload a file first', 'error');
        return;
    }
    
    // Simulate calculation
    simulateCalculation();
}

function addManualTransaction() {
    const entityName = document.getElementById('entityName').value;
    const fundName = document.getElementById('fundName').value;
    const tradeDate = document.getElementById('tradeDate').value;
    const transactionType = document.getElementById('transactionType').value;
    const quantity = document.getElementById('quantity').value;
    const price = document.getElementById('price').value;
    
    // Validate inputs
    if (!entityName || !fundName || !tradeDate || !transactionType || !quantity || !price) {
        showNotification('Please fill in all fields', 'error');
        return;
    }
    
    const transaction = {
        id: Date.now(),
        entityName,
        fundName,
        tradeDate,
        transactionType,
        quantity: parseFloat(quantity),
        price: parseFloat(price),
        amount: parseFloat(quantity) * parseFloat(price)
    };
    
    manualTransactions.push(transaction);
    
    // Add to table
    addTransactionToTable(transaction);
    
    // Clear form
    document.getElementById('entityName').value = '';
    document.getElementById('fundName').value = '';
    document.getElementById('tradeDate').value = '';
    document.getElementById('transactionType').value = '';
    document.getElementById('quantity').value = '';
    document.getElementById('price').value = '';
    
    showNotification('Transaction added successfully', 'success');
}

function addTransactionToTable(transaction) {
    const row = document.createElement('div');
    row.className = 'transaction-row';
    row.innerHTML = `
        <div class="table-cell">${transaction.entityName}</div>
        <div class="table-cell">${transaction.fundName}</div>
        <div class="table-cell">${transaction.tradeDate}</div>
        <div class="table-cell">${transaction.transactionType}</div>
        <div class="table-cell">${transaction.quantity}</div>
        <div class="table-cell">$${transaction.price.toFixed(2)}</div>
        <div class="table-cell">
            <button class="delete-btn" onclick="deleteTransaction(${transaction.id})">
                <i class="fas fa-trash"></i> Delete
            </button>
        </div>
    `;
    
    tableBody.appendChild(row);
}

function deleteTransaction(id) {
    manualTransactions = manualTransactions.filter(t => t.id !== id);
    updateTransactionsTable();
    showNotification('Transaction deleted', 'success');
}

function updateTransactionsTable() {
    tableBody.innerHTML = '';
    manualTransactions.forEach(addTransactionToTable);
}

function calculateFromManual() {
    if (manualTransactions.length === 0) {
        showNotification('Please add at least one transaction', 'error');
        return;
    }
    
    // Simulate calculation
    simulateCalculation();
}

// Calculate single transaction loss using API
async function calculateManualLoss() {
    // Validate inputs
    if (!manualPurchaseDate.value) {
        showNotification('Please enter purchase date', 'error');
        return;
    }
    
    if (!manualBeginningHoldings.checked && !manualPurchasePrice.value) {
        showNotification('Please enter purchase price', 'error');
        return;
    }
    
    if (!manualSaleDate.value) {
        showNotification('Please enter sale date', 'error');
        return;
    }
    
    if (!manualSalePrice.value) {
        showNotification('Please enter sale price', 'error');
        return;
    }
    
    if (!manualQuantity.value || parseFloat(manualQuantity.value) <= 0) {
        showNotification('Please enter valid quantity', 'error');
        return;
    }
    
    // Show loading
    manualCalculateBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Calculating...';
    manualCalculateBtn.disabled = true;
    
    try {
        const requestBody = {
            settlement_type: currentSettlement === 'twitter' ? 'TWITTER' : 'KRAFT_HEINZ',
            purchase_date: manualPurchaseDate.value,
            purchase_price: manualBeginningHoldings.checked ? 0 : parseFloat(manualPurchasePrice.value),
            sale_date: manualSaleDate.value,
            sale_price: parseFloat(manualSalePrice.value),
            quantity: parseFloat(manualQuantity.value),
            is_beginning_holdings: manualBeginningHoldings.checked
        };
        
        const response = await fetch(`${API_URL}/calculate/single`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(requestBody)
        });
        
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ detail: 'Calculation failed' }));
            throw new Error(errorData.detail || 'Calculation failed');
        }
        
        const result = await response.json();
        displayManualResult(result);
        
        showNotification('Calculation completed successfully', 'success');
        
    } catch (error) {
        console.error('Manual calculation error:', error);
        
        // Fallback to simulation if API fails
        showNotification('Using simulated data (API unavailable)', 'warning');
        simulateManualCalculation();
        
    } finally {
        manualCalculateBtn.innerHTML = '<i class="fas fa-calculator"></i> Calculate Loss';
        manualCalculateBtn.disabled = false;
    }
}

// Simulate manual calculation (fallback when API is unavailable)
function simulateManualCalculation() {
    const purchasePrice = manualBeginningHoldings.checked ? 0 : parseFloat(manualPurchasePrice.value);
    const salePrice = parseFloat(manualSalePrice.value);
    const quantity = parseFloat(manualQuantity.value);
    
    // Simple calculation logic
    const lossPerShare = Math.max(0, purchasePrice - salePrice);
    const totalLoss = lossPerShare * quantity;
    
    const simulatedResult = {
        calculation_id: `sim_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        timestamp: new Date().toISOString(),
        settlement_type: currentSettlement === 'twitter' ? 'TWITTER' : 'KRAFT_HEINZ',
        input: {
            purchase_date: manualPurchaseDate.value,
            purchase_price: purchasePrice,
            sale_date: manualSaleDate.value,
            sale_price: salePrice,
            quantity: quantity,
            is_beginning_holdings: manualBeginningHoldings.checked
        },
        result: {
            recognized_loss_per_share: lossPerShare,
            total_recognized_loss: totalLoss,
            rule_applied: manualBeginningHoldings.checked ? 'Beginning Holdings Rule' : 'Standard FIFO Rule',
            rule_code: manualBeginningHoldings.checked ? 'BH' : 'FIFO',
            details: manualBeginningHoldings.checked ? 
                'Beginning holdings purchased at class start date with $0.00 cost basis' :
                'Standard purchase and sale transaction'
        },
        processing_time_ms: 45.2
    };
    
    displayManualResult(simulatedResult);
}

// Display manual calculation result
function displayManualResult(result) {
    manualResultContainer.style.display = 'block';
    
    manualResultGrid.innerHTML = `
        <div class="calculator-result-item">
            <div class="calculator-result-label">Loss per Share</div>
            <div class="calculator-result-value loss">$${result.result.recognized_loss_per_share.toFixed(4)}</div>
        </div>
        
        <div class="calculator-result-item">
            <div class="calculator-result-label">Total Loss</div>
            <div class="calculator-result-value loss">$${result.result.total_recognized_loss.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</div>
        </div>
        
        <div class="calculator-result-item">
            <div class="calculator-result-label">Rule Applied</div>
            <div class="calculator-result-value">${result.result.rule_applied}</div>
        </div>
        
        <div class="calculator-result-item">
            <div class="calculator-result-label">Rule Code</div>
            <div class="calculator-result-value">${result.result.rule_code}</div>
        </div>
        
        <div class="calculator-result-item">
            <div class="calculator-result-label">Processing Time</div>
            <div class="calculator-result-value">${result.processing_time_ms}ms</div>
        </div>
        
        <div class="calculator-result-item" style="grid-column: span 2;">
            <div class="calculator-result-label">Calculation ID</div>
            <div class="calculator-result-value" style="font-size: 0.875rem; font-family: monospace;">${result.calculation_id}</div>
        </div>
        
        <div class="calculator-result-item" style="grid-column: span 2;">
            <div class="calculator-result-label">Details</div>
            <div class="calculator-result-value" style="font-size: 0.875rem; color: var(--text-muted);">${result.result.details || 'No additional details'}</div>
        </div>
    `;
    
    // Scroll to results
    manualResultContainer.scrollIntoView({ behavior: 'smooth' });
}

// Reset manual calculator
function resetManualCalculator() {
    const today = new Date().toISOString().split('T')[0];
    manualPurchaseDate.value = today;
    manualPurchasePrice.value = '';
    manualSaleDate.value = today;
    manualSalePrice.value = '';
    manualQuantity.value = '1';
    manualBeginningHoldings.checked = false;
    handleBeginningHoldingsChange();
    manualResultContainer.style.display = 'none';
    showNotification('Calculator reset', 'success');
}

function simulateCalculation() {
    // Show loading state
    const calculateButton = manualTransactions.length > 0 ? calculateManualBtn : calculateBtn;
    const originalText = calculateButton.innerHTML;
    calculateButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Calculating...';
    calculateButton.disabled = true;
    
    // Simulate API call delay
    setTimeout(() => {
        // Generate mock results
        generateMockResults();
        
        // Generate preview data
        generatePreviewData();
        
        // Show results section
        resultsSection.style.display = 'block';
        resultsSection.scrollIntoView({ behavior: 'smooth' });
        
        // Switch to results tab
        switchResultsTab('results');
        
        // Reset button
        calculateButton.innerHTML = originalText;
        calculateButton.disabled = false;
        
        showNotification('Calculation completed successfully', 'success');
    }, 1500);
}

function generateMockResults() {
    const settlementName = currentSettlement === 'twitter' ? 'Twitter Inc.' : 'Kraft Heinz';
    const totalTransactions = uploadedFile ? 1250 : manualTransactions.length;
    const recognizedLoss = uploadedFile ? 
        (currentSettlement === 'twitter' ? 452187.65 : 321456.78) :
        manualTransactions.reduce((sum, t) => sum + t.amount, 0) * 0.85;
    
    // Generate mock client breakdown
    const clientBreakdown = [
        { name: 'ABC Investments', loss: 125000, shares: 50000, matches: 45 },
        { name: 'XYZ Capital', loss: 98750, shares: 39500, matches: 32 },
        { name: 'Global Funds', loss: 85620, shares: 34248, matches: 28 },
        { name: 'Premier Trust', loss: 72310, shares: 28924, matches: 25 },
        { name: 'Wealth Management', loss: 65480, shares: 26192, matches: 22 }
    ];
    
    // Generate mock fund breakdown
    const fundBreakdown = [
        { name: 'Growth Fund A', loss: 185000, shares: 74000, clients: 8 },
        { name: 'Value Fund B', loss: 142500, shares: 57000, clients: 6 },
        { name: 'Index Fund C', loss: 98500, shares: 39400, clients: 5 },
        { name: 'Dividend Fund D', loss: 75600, shares: 30240, clients: 4 }
    ];
    
    calculationResults = {
        settlement: settlementName,
        totalTransactions,
        recognizedLoss,
        eligibleShares: Math.floor(totalTransactions * 0.85),
        calculationDate: new Date().toLocaleDateString(),
        calculationTime: new Date().toLocaleTimeString(),
        avgLossPerShare: (recognizedLoss / totalTransactions).toFixed(2),
        successRate: '99.8%',
        processingTime: '856ms',
        clientBreakdown,
        fundBreakdown,
        methodology: `The recognized loss calculation follows the ${settlementName} settlement methodology approved by the court. Losses are calculated using the First-In, First-Out (FIFO) matching method for transactions during the class period. Only eligible transactions meeting the settlement criteria are included in the calculation.`,
        rulesApplied: [
            { name: 'Rule 1: FIFO Matching', description: 'First-in, first-out matching of purchases and sales', count: 450 },
            { name: 'Rule 2: Class Period', description: 'Only transactions within class period considered', count: 1250 },
            { name: 'Rule 3: Eligible Securities', description: 'Only common stock transactions included', count: 1205 },
            { name: 'Rule 4: Price Adjustments', description: 'Adjusted for dividends and splits', count: 890 }
        ]
    };
    
    // Update Results Tab
    updateResultsTab();
    
    // Update Detailed Report Tab
    updateDetailedReportTab();
    
    // Update Statistics Tab
    updateStatisticsTab();
}

function generatePreviewData() {
    previewData = [];
    
    // Generate mock preview data
    const entities = ['ABC Investments', 'XYZ Capital', 'Global Funds', 'Premier Trust', 'Wealth Management'];
    const funds = ['Growth Fund A', 'Value Fund B', 'Index Fund C', 'Dividend Fund D'];
    const transactionTypes = ['BUY', 'SELL'];
    
    const numItems = uploadedFile ? 1250 : manualTransactions.length;
    
    for (let i = 0; i < Math.min(numItems, 100); i++) {
        const entity = entities[Math.floor(Math.random() * entities.length)];
        const fund = funds[Math.floor(Math.random() * funds.length)];
        const date = `2023-${String(Math.floor(Math.random() * 12) + 1).padStart(2, '0')}-${String(Math.floor(Math.random() * 28) + 1).padStart(2, '0')}`;
        const type = transactionTypes[Math.floor(Math.random() * transactionTypes.length)];
        const quantity = Math.floor(Math.random() * 10000) + 100;
        const price = parseFloat((Math.random() * 100 + 50).toFixed(2));
        
        previewData.push({
            entity,
            fund,
            date,
            type,
            quantity,
            price,
            amount: quantity * price
        });
    }
    
    // Update Data Preview Tab
    updateDataPreviewTab();
}

function updateResultsTab() {
    // Update main results summary
    resultsSummary.innerHTML = `
        <div class="result-item">
            <div class="result-label">Selected Settlement</div>
            <div class="result-value">${calculationResults.settlement}</div>
        </div>
        <div class="result-item">
            <div class="result-label">Total Transactions Processed</div>
            <div class="result-value">${calculationResults.totalTransactions.toLocaleString()}</div>
        </div>
        <div class="result-item">
            <div class="result-label">Eligible Shares</div>
            <div class="result-value">${calculationResults.eligibleShares.toLocaleString()}</div>
        </div>
        <div class="result-item">
            <div class="result-label">Total Recognized Loss</div>
            <div class="result-value">$${calculationResults.recognizedLoss.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</div>
        </div>
        <div class="result-item">
            <div class="result-label">Calculation Date</div>
            <div class="result-value">${calculationResults.calculationDate}</div>
        </div>
        <div class="result-item">
            <div class="result-label">Processing Time</div>
            <div class="result-value">${calculationResults.processingTime}</div>
        </div>
    `;
    
    // Update client breakdown
    const clientBreakdown = document.getElementById('clientBreakdown');
    clientBreakdown.innerHTML = calculationResults.clientBreakdown.map(client => `
        <div class="breakdown-card">
            <div class="breakdown-header">
                <div class="breakdown-name">${client.name}</div>
                <div class="breakdown-badge">${client.matches} matches</div>
            </div>
            <div class="breakdown-stats">
                <div class="breakdown-stat">
                    <div class="stat-label-small">Recognized Loss</div>
                    <div class="stat-value-small loss">$${client.loss.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</div>
                </div>
                <div class="breakdown-stat">
                    <div class="stat-label-small">Total Shares</div>
                    <div class="stat-value-small">${client.shares.toLocaleString()}</div>
                </div>
                <div class="breakdown-stat">
                    <div class="stat-label-small">Avg Loss/Share</div>
                    <div class="stat-value-small">$${(client.loss / client.shares).toFixed(2)}</div>
                </div>
                <div class="breakdown-stat">
                    <div class="stat-label-small">Funds</div>
                    <div class="stat-value-small">${Math.floor(client.matches / 2)}</div>
                </div>
            </div>
        </div>
    `).join('');
    
    // Update fund breakdown
    const fundBreakdown = document.getElementById('fundBreakdown');
    fundBreakdown.innerHTML = calculationResults.fundBreakdown.map(fund => `
        <div class="breakdown-card">
            <div class="breakdown-header">
                <div class="breakdown-name">${fund.name}</div>
                <div class="breakdown-badge">${fund.clients} clients</div>
            </div>
            <div class="breakdown-stats">
                <div class="breakdown-stat">
                    <div class="stat-label-small">Recognized Loss</div>
                    <div class="stat-value-small loss">$${fund.loss.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</div>
                </div>
                <div class="breakdown-stat">
                    <div class="stat-label-small">Total Shares</div>
                    <div class="stat-value-small">${fund.shares.toLocaleString()}</div>
                </div>
                <div class="breakdown-stat">
                    <div class="stat-label-small">Avg Loss/Share</div>
                    <div class="stat-value-small">$${(fund.loss / fund.shares).toFixed(2)}</div>
                </div>
                <div class="breakdown-stat">
                    <div class="stat-label-small">Transactions</div>
                    <div class="stat-value-small">${Math.floor(fund.shares / 100)}</div>
                </div>
            </div>
        </div>
    `).join('');
}

function updateDataPreviewTab() {
    // Update transaction count
    const total = previewData.length;
    totalTransactions.textContent = `${total} transactions loaded`;
    
    // Calculate pagination
    const totalPages = Math.ceil(total / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = Math.min(startIndex + itemsPerPage, total);
    
    previewRange.textContent = `Showing ${startIndex + 1}-${endIndex} of ${total}`;
    
    // Update table
    dataTableBody.innerHTML = '';
    for (let i = startIndex; i < endIndex; i++) {
        const item = previewData[i];
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${item.entity}</td>
            <td>${item.fund}</td>
            <td>${item.date}</td>
            <td><span class="transaction-type ${item.type.toLowerCase()}">${item.type}</span></td>
            <td>${item.quantity.toLocaleString()}</td>
            <td>$${item.price.toFixed(2)}</td>
            <td>$${(item.quantity * item.price).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td>
        `;
        dataTableBody.appendChild(row);
    }
    
    // Update pagination
    updatePaginationControls(totalPages);
}

function updatePaginationControls(totalPages) {
    let paginationHTML = `
        <div class="pagination-info">
            Page ${currentPage} of ${totalPages}
        </div>
        <div class="pagination-controls">
    `;
    
    // Previous button
    paginationHTML += `
        <button class="page-btn" ${currentPage === 1 ? 'disabled' : ''} onclick="changePage(${currentPage - 1})">
            <i class="fas fa-chevron-left"></i> Previous
        </button>
    `;
    
    // Page numbers
    for (let i = 1; i <= Math.min(totalPages, 5); i++) {
        paginationHTML += `
            <button class="page-btn ${i === currentPage ? 'active' : ''}" onclick="changePage(${i})">
                ${i}
            </button>
        `;
    }
    
    // Next button
    paginationHTML += `
        <button class="page-btn" ${currentPage === totalPages ? 'disabled' : ''} onclick="changePage(${currentPage + 1})">
            Next <i class="fas fa-chevron-right"></i>
        </button>
    `;
    
    paginationHTML += '</div>';
    tablePagination.innerHTML = paginationHTML;
}

function changePage(page) {
    currentPage = page;
    updateDataPreviewTab();
}

function updateDetailedReportTab() {
    // Update report summary
    const reportSummary = document.getElementById('reportSummary');
    reportSummary.innerHTML = `
        <div class="report-item">
            <div class="report-item-label">Calculation ID</div>
            <div class="report-item-value">CALC-${Date.now().toString().slice(-8)}</div>
        </div>
        <div class="report-item">
            <div class="report-item-label">Settlement Case</div>
            <div class="report-item-value">${calculationResults.settlement}</div>
        </div>
        <div class="report-item">
            <div class="report-item-label">Calculation Date</div>
            <div class="report-item-value">${calculationResults.calculationDate}</div>
        </div>
        <div class="report-item">
            <div class="report-item-label">Processing Time</div>
            <div class="report-item-value">${calculationResults.processingTime}</div>
        </div>
        <div class="report-item">
            <div class="report-item-label">Total Recognized Loss</div>
            <div class="report-item-value">$${calculationResults.recognizedLoss.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</div>
        </div>
        <div class="report-item">
            <div class="report-item-label">Success Rate</div>
            <div class="report-item-value">${calculationResults.successRate}</div>
        </div>
    `;
    
    // Update methodology
    const methodology = document.getElementById('calculationMethodology');
    methodology.innerHTML = `
        <p>${calculationResults.methodology}</p>
        <p style="margin-top: 1rem;">The calculation includes the following steps:</p>
        <ol style="margin-top: 0.5rem; padding-left: 1.5rem;">
            <li>Validation of transaction data against settlement requirements</li>
            <li>Filtering of transactions within the class period</li>
            <li>Application of FIFO matching algorithm</li>
            <li>Calculation of recognized loss for each matched pair</li>
            <li>Aggregation of results by client and fund</li>
            <li>Generation of detailed reports and statistics</li>
        </ol>
    `;
    
    // Update rules applied
    const rulesApplied = document.getElementById('rulesApplied');
    rulesApplied.innerHTML = calculationResults.rulesApplied.map(rule => `
        <div class="rule-card">
            <div class="rule-name">${rule.name}</div>
            <div class="rule-desc">${rule.description}</div>
            <div class="rule-stats">
                <span>Applications:</span>
                <span class="rule-count">${rule.count}</span>
            </div>
        </div>
    `).join('');
}

function updateStatisticsTab() {
    // Update statistics
    totalLossStat.textContent = `$${calculationResults.recognizedLoss.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}`;
    transactionCount.textContent = calculationResults.totalTransactions.toLocaleString();
    avgLossPerShare.textContent = `$${calculationResults.avgLossPerShare}`;
    successRate.textContent = calculationResults.successRate;
    processingTime.textContent = calculationResults.processingTime;
    
    // Update client distribution chart
    updateClientChart();
    
    // Update transaction type pie chart
    updateTransactionPieChart();
    
    // Update detailed statistics table
    updateDetailedStatsTable();
}

function updateClientChart() {
    const maxLoss = Math.max(...calculationResults.clientBreakdown.map(c => c.loss));
    clientChartBars.innerHTML = calculationResults.clientBreakdown.map(client => {
        const height = (client.loss / maxLoss) * 150; // Max height 150px
        return `
            <div class="chart-bar" style="height: ${height}px;" title="${client.name}: $${client.loss.toLocaleString()}">
                <div class="bar-label">${client.name.split(' ')[0]}</div>
            </div>
        `;
    }).join('');
}

function updateTransactionPieChart() {
    transactionPieChart.innerHTML = `
        <div class="pie-center">
            ${previewData.length}<br>
            <small>Total</small>
        </div>
    `;
}

function updateDetailedStatsTable() {
    const stats = [
        { metric: 'Total Transactions', value: calculationResults.totalTransactions.toLocaleString(), description: 'Number of transactions processed' },
        { metric: 'Eligible Transactions', value: calculationResults.eligibleShares.toLocaleString(), description: 'Transactions meeting settlement criteria' },
        { metric: 'Average Loss per Share', value: `$${calculationResults.avgLossPerShare}`, description: 'Average recognized loss per share' },
        { metric: 'Success Rate', value: calculationResults.successRate, description: 'Percentage of transactions successfully processed' },
        { metric: 'Processing Time', value: calculationResults.processingTime, description: 'Time taken to process all transactions' },
        { metric: 'Data Volume', value: `${(previewData.length * 0.5).toFixed(1)} MB`, description: 'Estimated data volume processed' },
        { metric: 'Peak Memory Usage', value: '256 MB', description: 'Maximum memory used during calculation' },
        { metric: 'Error Rate', value: '0.2%', description: 'Percentage of transactions with errors' }
    ];
    
    detailedStatsBody.innerHTML = stats.map(stat => `
        <tr>
            <td><strong>${stat.metric}</strong></td>
            <td>${stat.value}</td>
            <td>${stat.description}</td>
        </tr>
    `).join('');
}

function exportDetailedReport() {
    let reportContent = `SETTLEMENT LOSS CALCULATION REPORT\n`;
    reportContent += `===================================\n\n`;
    reportContent += `Calculation Date: ${new Date().toLocaleDateString()}\n`;
    reportContent += `Settlement Case: ${calculationResults.settlement}\n`;
    reportContent += `Total Recognized Loss: $${calculationResults.recognizedLoss.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}\n`;
    reportContent += `Total Transactions: ${calculationResults.totalTransactions}\n\n`;
    
    reportContent += `CLIENT BREAKDOWN\n`;
    reportContent += `================\n`;
    calculationResults.clientBreakdown.forEach(client => {
        reportContent += `${client.name}: $${client.loss.toLocaleString()} (${client.shares} shares)\n`;
    });
    
    reportContent += `\nDETAILED STATISTICS\n`;
    reportContent += `===================\n`;
    reportContent += `Average Loss per Share: $${calculationResults.avgLossPerShare}\n`;
    reportContent += `Success Rate: ${calculationResults.successRate}\n`;
    reportContent += `Processing Time: ${calculationResults.processingTime}\n`;
    
    // Create blob and download
    const blob = new Blob([reportContent], { type: 'text/plain' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `detailed_report_${Date.now()}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
    
    showNotification('Detailed report exported successfully', 'success');
}

function downloadResults() {
    if (!calculationResults) {
        showNotification('No results to download', 'error');
        return;
    }
    
    // Create CSV content
    let csvContent = "Settlement Loss Calculation Report\n\n";
    csvContent += "Parameter,Value\n";
    csvContent += `Settlement Case,${calculationResults.settlement}\n`;
    csvContent += `Total Transactions,${calculationResults.totalTransactions}\n`;
    csvContent += `Eligible Shares,${calculationResults.eligibleShares}\n`;
    csvContent += `Recognized Loss,$${calculationResults.recognizedLoss.toFixed(2)}\n`;
    csvContent += `Calculation Date,${calculationResults.calculationDate}\n`;
    csvContent += `Calculation Time,${calculationResults.calculationTime}\n`;
    
    // Create blob and download
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `settlement_loss_report_${Date.now()}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
    
    showNotification('Report downloaded successfully', 'success');
}

function resetCalculator() {
    // Reset state
    uploadedFile = null;
    manualTransactions = [];
    calculationResults = null;
    previewData = [];
    currentPage = 1;
    
    // Reset UI
    uploadZone.innerHTML = `
        <div class="upload-icon">
            <i class="fas fa-file-upload"></i>
        </div>
        <h4>Upload Transaction Data</h4>
        <p>Drag and drop your Excel or CSV file here, or click to browse</p>
        <div class="upload-btn" id="browseBtn">
            <i class="fas fa-folder-open"></i>
            Browse Files
        </div>
    `;
    
    // Re-attach event listener
    const newBrowseBtn = document.getElementById('browseBtn');
    newBrowseBtn.addEventListener('click', () => fileInput.click());
    
    // Clear manual transactions table
    tableBody.innerHTML = '';
    
    // Clear form fields
    document.getElementById('entityName').value = '';
    document.getElementById('fundName').value = '';
    document.getElementById('tradeDate').value = '';
    document.getElementById('transactionType').value = '';
    document.getElementById('quantity').value = '';
    document.getElementById('price').value = '';
    
    // Clear results tabs
    resultsSummary.innerHTML = '';
    document.getElementById('clientBreakdown').innerHTML = '';
    document.getElementById('fundBreakdown').innerHTML = '';
    dataTableBody.innerHTML = '';
    tablePagination.innerHTML = '';
    document.getElementById('reportSummary').innerHTML = '';
    document.getElementById('calculationMethodology').innerHTML = '';
    document.getElementById('rulesApplied').innerHTML = '';
    detailedStatsBody.innerHTML = '';
    
    // Reset statistics
    totalLossStat.textContent = '$0.00';
    transactionCount.textContent = '0';
    avgLossPerShare.textContent = '$0.00';
    successRate.textContent = '100%';
    processingTime.textContent = '0ms';
    clientChartBars.innerHTML = '';
    transactionPieChart.innerHTML = '';
    
    // Hide results section
    resultsSection.style.display = 'none';
    
    // Switch to upload tab
    switchTab('upload');
    
    showNotification('Calculator reset successfully', 'success');
    
    // Scroll to top
    scrollToTop();
}

function scrollToTop() {
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function handleScroll() {
    if (window.scrollY > 300) {
        backToTopBtn.style.display = 'flex';
    } else {
        backToTopBtn.style.display = 'none';
    }
}

function showNotification(message, type) {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.innerHTML = `
        <i class="fas fa-${type === 'success' ? 'check-circle' : 'exclamation-circle'}"></i>
        <span>${message}</span>
    `;
    
    // Add styles for notification
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background-color: ${type === 'success' ? '#10b981' : '#ef4444'};
        color: white;
        padding: 1rem 1.5rem;
        border-radius: 8px;
        display: flex;
        align-items: center;
        gap: 0.75rem;
        box-shadow: 0 4px 6px rgba(0,0,0,0.1);
        z-index: 1000;
        animation: slideIn 0.3s ease;
    `;
    
    // Add animation keyframes
    const style = document.createElement('style');
    style.textContent = `
        @keyframes slideIn {
            from { transform: translateX(100%); opacity: 0; }
            to { transform: translateX(0); opacity: 1; }
        }
        @keyframes slideOut {
            from { transform: translateX(0); opacity: 1; }
            to { transform: translateX(100%); opacity: 0; }
        }
    `;
    document.head.appendChild(style);
    
    document.body.appendChild(notification);
    
    // Remove notification after 3 seconds
    setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => {
            document.body.removeChild(notification);
        }, 300);
    }, 3000);
}

// Make functions available globally for inline event handlers
window.deleteTransaction = deleteTransaction;
window.changePage = changePage;
window.scrollToSettlementSection = scrollToSettlementSection;
window.selectSettlement = selectSettlement;
window.switchTab = switchTab;
window.resetManualCalculator = resetManualCalculator;