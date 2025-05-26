// Variabel ini adalah kunci koneksi ke backend.
// Pastikan alamat ini sesuai dengan tempat backend API Anda berjalan.
const API_BASE_URL = 'http://localhost:8000';
let charts = {};

async function checkApiConnection() {
    try {
        const response = await fetch(`${API_BASE_URL}/health`);
        if (response.ok) {
            document.getElementById('api-status').innerHTML = '🟢 Connected';
            document.getElementById('connection-status').innerHTML = 
                '<div class="success-message">✅ Successfully connected to backend API</div>';
        } else {
            throw new Error('API not responding');
        }
    } catch (error) {
        document.getElementById('api-status').innerHTML = '🔴 Disconnected';
        document.getElementById('connection-status').innerHTML = 
            '<div class="error-message">❌ Cannot connect to backend API. Please ensure the backend server is running on http://localhost:8000</div>';
    }
}

function showSection(section) {
    document.querySelectorAll('.sidebar-item').forEach(item => item.classList.remove('active'));
    event.target.closest('.sidebar-item').classList.add('active');
    document.querySelectorAll('[id$="-section"]').forEach(el => el.classList.add('hidden'));
    document.getElementById(section + '-section').classList.remove('hidden');
    const titles = {'home': 'Home Dashboard', 'forecasting': 'Stock Forecasting', 'clustering': 'Stock Clustering', 'analysis': 'Market Analysis', 'portfolio': 'Portfolio Tracker'};
    document.getElementById('page-title').textContent = titles[section];
}

async function loadData() {
    const ticker = document.getElementById('ticker-search').value.trim().toUpperCase() || '';
    showLoading(true);
    try {
        const companyResponse = await fetch(`${API_BASE_URL}/company/${ticker}`);
        if (!companyResponse.ok) throw new Error(`Error fetching company data: ${companyResponse.statusText}`);
        const companyData = await companyResponse.json();
        
        const priceResponse = await fetch(`${API_BASE_URL}/stock-prices/${ticker}?limit=30&timeframe=1d`);
        if (!priceResponse.ok) throw new Error(`Error fetching price data: ${priceResponse.statusText}`);
        const priceData = await priceResponse.json();
        
        updateQuickStats(companyData, priceData);
        updateCompanyInfo(companyData.info);
        updateFinancialMetrics(companyData.finance);
        updateValuationMetrics(companyData.valuation);
        updateGrowthMetrics(companyData.growth);
        updateProfitabilityLiquidity(companyData.profitabilities, companyData.liquidity);
        updatePriceTable(priceData);
        updatePriceChart(priceData);
        updateVolumeChart(priceData);
        document.getElementById('connection-status').innerHTML = '';
    } catch (error) {
        console.error('Error loading data:', error);
        document.getElementById('connection-status').innerHTML = `<div class="error-message">❌ Error loading data for ${ticker}: ${error.message}</div>`;
    } finally {
        showLoading(false);
    }
}

function updateQuickStats(companyData, priceData) {
    const marketCap = companyData.finance?.marketcap;
    document.getElementById('market-cap-display').textContent = formatValue(marketCap, true);
    const currentPrice = priceData.length > 0 ? priceData[0].close : 0;
    document.getElementById('current-price-display').textContent = `$${currentPrice.toFixed(2)}`;
    const peRatio = companyData.valuation?.trailingpe;
    document.getElementById('pe-ratio-display').textContent = peRatio ? peRatio.toFixed(1) : 'N/A';
    const volume = priceData.length > 0 ? priceData[0].volume : 0;
    document.getElementById('volume-display').textContent = formatVolume(volume);
}

function updateCompanyInfo(info) {
    const container = document.getElementById('company-info');
    if (!info) { container.innerHTML = '<p class="text-red-500">No company info available</p>'; return; }
    container.innerHTML = `<div class="space-y-2"><h4 class="font-semibold">${info.longname || info.ticker}</h4><p class="text-sm text-gray-600">${info.sector || 'N/A'}</p><p class="text-sm">${info.longbusinesssummary ? info.longbusinesssummary.substring(0, 200) + '...' : 'No summary available'}</p><div class="mt-2 text-sm"><p><strong>Website:</strong> ${info.website || 'N/A'}</p><p><strong>Phone:</strong> ${info.phone || 'N/A'}</p></div></div>`;
}

function updateFinancialMetrics(finance) {
    const container = document.getElementById('financial-metrics');
    if (!finance) { container.innerHTML = '<p class="text-red-500">No financial data available</p>'; return; }
    container.innerHTML = `<div class="space-y-3"><div class="flex justify-between"><span class="text-sm">Market Cap:</span><span class="font-semibold">${formatValue(finance.marketcap, true)}</span></div><div class="flex justify-between"><span class="text-sm">Revenue:</span><span class="font-semibold">${formatValue(finance.totalrevenue, true)}</span></div><div class="flex justify-between"><span class="text-sm">Net Income:</span><span class="font-semibold">${formatValue(finance.netincometocommon, true)}</span></div><div class="flex justify-between"><span class="text-sm">EPS (TTM):</span><span class="font-semibold">${formatValue(finance.trailingeps)}</span></div><div class="flex justify-between"><span class="text-sm">Profit Margin:</span><span class="font-semibold">${formatPercentage(finance.profitmargins)}</span></div><div class="flex justify-between"><span class="text-sm">Free Cash Flow:</span><span class="font-semibold">${formatValue(finance.freecashflow, true)}</span></div></div>`;
}

function updateValuationMetrics(valuation) {
    const container = document.getElementById('valuation-metrics');
    if (!valuation) { container.innerHTML = '<p class="text-red-500">No valuation data available</p>'; return; }
    container.innerHTML = `<div class="space-y-3"><div class="flex justify-between"><span class="text-sm">P/E Ratio:</span><span class="font-semibold">${formatValue(valuation.trailingpe)}</span></div><div class="flex justify-between"><span class="text-sm">Forward P/E:</span><span class="font-semibold">${formatValue(valuation.forwardpe)}</span></div><div class="flex justify-between"><span class="text-sm">PEG Ratio:</span><span class="font-semibold">${formatValue(valuation.pegratio)}</span></div><div class="flex justify-between"><span class="text-sm">Price/Book:</span><span class="font-semibold">${formatValue(valuation.pricetobook)}</span></div><div class="flex justify-between"><span class="text-sm">P/S (TTM):</span><span class="font-semibold">${formatValue(valuation.pricetosalestrailing12months)}</span></div></div>`;
}

function updateGrowthMetrics(growth) {
    const container = document.getElementById('growth-metrics');
    if (!growth) { container.innerHTML = '<p class="text-red-500">No growth data available</p>'; return; }
    container.innerHTML = `<div class="space-y-3"><div class="flex justify-between"><span class="text-sm">Revenue Growth:</span><span class="font-semibold">${formatPercentage(growth.revenuegrowth)}</span></div><div class="flex justify-between"><span class="text-sm">Earnings Growth:</span><span class="font-semibold">${formatPercentage(growth.earningsgrowth)}</span></div><div class="flex justify-between"><span class="text-sm">Earnings Growth (QoQ):</span><span class="font-semibold">${formatPercentage(growth.earningsquarterlygrowth)}</span></div></div>`;
}

function updateProfitabilityLiquidity(profitabilities, liquidity) {
    const container = document.getElementById('profitability-liquidity');
    let html = '<div class="space-y-3">';
    if (profitabilities) { html += `<div class="flex justify-between"><span class="text-sm">Return on Equity:</span><span class="font-semibold">${formatPercentage(profitabilities.returnonequity)}</span></div><div class="flex justify-between"><span class="text-sm">Return on Assets:</span><span class="font-semibold">${formatPercentage(profitabilities.returnonassets)}</span></div>`; }
    if (liquidity) { html += `<div class="flex justify-between"><span class="text-sm">Current Ratio:</span><span class="font-semibold">${formatValue(liquidity.currentratio)}</span></div><div class="flex justify-between"><span class="text-sm">Total Cash:</span><span class="font-semibold">${formatValue(liquidity.totalcash, true)}</span></div><div class="flex justify-between"><span class="text-sm">Total Debt:</span><span class="font-semibold">${formatValue(liquidity.totaldebt, true)}</span></div><div class="flex justify-between"><span class="text-sm">Debt to Equity:</span><span class="font-semibold">${formatValue(liquidity.debttoequity)}</span></div>`; }
    html += '</div>';
    if (!profitabilities && !liquidity) { html = '<p class="text-red-500">No profitability & liquidity data available</p>'; }
    container.innerHTML = html;
}

function updatePriceTable(priceData) {
    const tableBody = document.getElementById('price-table-body');
    if (!priceData || priceData.length === 0) { tableBody.innerHTML = '<tr><td colspan="6" class="px-6 py-4 text-sm text-gray-500 text-center">No price data available</td></tr>'; return; }
    let html = '';
    for (const price of priceData.slice(0, 10)) {
        html += `<tr class="hover:bg-gray-50"><td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${new Date(price.datetime).toLocaleDateString()}</td><td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">$${price.open?.toFixed(2) || 'N/A'}</td><td class="px-6 py-4 whitespace-nowrap text-sm text-green-600">$${price.high?.toFixed(2) || 'N/A'}</td><td class="px-6 py-4 whitespace-nowrap text-sm text-red-600">$${price.low?.toFixed(2) || 'N/A'}</td><td class="px-6 py-4 whitespace-nowrap text-sm font-semibold">$${price.close?.toFixed(2) || 'N/A'}</td><td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${formatVolume(price.volume)}</td></tr>`;
    }
    tableBody.innerHTML = html;
}

function updatePriceChart(data) {
    const ctx = document.getElementById('price-chart').getContext('2d');
    if (charts.priceChart) charts.priceChart.destroy();
    const sortedData = [...data].sort((a, b) => new Date(a.datetime) - new Date(b.datetime));
    charts.priceChart = new Chart(ctx, { type: 'line', data: { labels: sortedData.map(d => new Date(d.datetime).toLocaleDateString()), datasets: [{ label: 'Close Price', data: sortedData.map(d => d.close), borderColor: 'rgb(99, 102, 241)', backgroundColor: 'rgba(99, 102, 241, 0.1)', tension: 0.4, fill: true, pointRadius: 2, pointHoverRadius: 6 }] }, options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { ticks: { callback: (value) => '$' + value.toFixed(2) } } }, interaction: { intersect: false, mode: 'index' } } });
}

function updateVolumeChart(data) {
    const ctx = document.getElementById('volume-chart').getContext('2d');
    if (charts.volumeChart) charts.volumeChart.destroy();
    const sortedData = [...data].sort((a, b) => new Date(a.datetime) - new Date(b.datetime));
    charts.volumeChart = new Chart(ctx, { type: 'bar', data: { labels: sortedData.map(d => new Date(d.datetime).toLocaleDateString()), datasets: [{ label: 'Volume', data: sortedData.map(d => d.volume), backgroundColor: 'rgba(34, 197, 94, 0.6)', borderColor: 'rgb(34, 197, 94)', borderWidth: 1 }] }, options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { ticks: { callback: (value) => formatVolume(value) } } } } });
}

function formatValue(value, isCurrency = false) {
    if (value === null || value === undefined || isNaN(value)) return 'N/A';
    if (isCurrency) {
        if (Math.abs(value) >= 1.0e+12) return '$' + (value / 1.0e+12).toFixed(2) + 'T';
        if (Math.abs(value) >= 1.0e+9) return '$' + (value / 1.0e+9).toFixed(2) + 'B';
        if (Math.abs(value) >= 1.0e+6) return '$' + (value / 1.0e+6).toFixed(2) + 'M';
        if (Math.abs(value) >= 1.0e+3) return '$' + (value / 1.0e+3).toFixed(2) + 'K';
        return '$' + value.toFixed(2);
    }
    return value.toFixed(2);
}

function formatPercentage(value) {
    if (value === null || value === undefined || isNaN(value)) return 'N/A';
    return (value * 100).toFixed(2) + '%';
}

function formatVolume(value) {
    if (value === null || value === undefined || isNaN(value)) return 'N/A';
    if (value >= 1.0e+9) return (value / 1.0e+9).toFixed(1) + 'B';
    if (value >= 1.0e+6) return (value / 1.0e+6).toFixed(1) + 'M';
    if (value >= 1.0e+3) return (value / 1.0e+3).toFixed(1) + 'K';
    return value.toLocaleString();
}

function showLoading(show) {
    document.getElementById('loading').classList.toggle('active', show);
}

document.addEventListener('DOMContentLoaded', function() {
    checkApiConnection();
    setTimeout(() => {
        document.getElementById('ticker-search').value = '';
        loadData();
    }, 1000);
});

document.getElementById('ticker-search').addEventListener('keypress', function(e) {
    if (e.key === 'Enter') {
        loadData();
    }
});