/**
 * =================================================================
 * DASHBOARD INITIALIZATION & THEME MANAGEMENT
 * =================================================================
 */

// API base URL
const API_BASE_URL = 'http://localhost:5000/api';

// Chart instances and data cache
let monthlyRevenueChart, topProductsChart, segmentRevenueChart;
let monthlyRevenueData, topProductsData, segmentRevenueData;

// DOM Elements
const themeToggleBtn = document.getElementById('theme-toggle');
const themeToggleDarkIcon = document.getElementById('theme-toggle-dark-icon');
const themeToggleLightIcon = document.getElementById('theme-toggle-light-icon');

// Initialize on DOMContentLoaded
document.addEventListener('DOMContentLoaded', () => {
    initializeTheme();
    initializeDashboard();
});

/**
 * =================================================================
 * THEME SWITCHER LOGIC
 * =================================================================
 */

function initializeTheme() {
    // Show the correct icon based on the current theme
    if (localStorage.getItem('theme') === 'dark' || (!('theme' in localStorage) && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
        document.documentElement.classList.add('dark');
        themeToggleLightIcon.classList.remove('hidden');
    } else {
        document.documentElement.classList.remove('dark');
        themeToggleDarkIcon.classList.remove('hidden');
    }

    themeToggleBtn.addEventListener('click', () => {
        // Toggle theme class
        document.documentElement.classList.toggle('dark');

        // Update localStorage
        const isDarkMode = document.documentElement.classList.contains('dark');
        localStorage.setItem('theme', isDarkMode ? 'dark' : 'light');

        // Toggle icons
        themeToggleDarkIcon.classList.toggle('hidden');
        themeToggleLightIcon.classList.toggle('hidden');

        // Re-render all charts with the new theme
        renderAllCharts();
    });
}


/**
 * =================================================================
 * DASHBOARD DATA LOADING & RENDERING
 * =================================================================
 */

async function initializeDashboard() {
    console.log('Dashboard initializing...');
    try {
        await loadKPIs();
        
        // Fetch all chart data in parallel
        [monthlyRevenueData, topProductsData, segmentRevenueData] = await Promise.all([
            fetchFromAPI('/monthly-revenue'),
            fetchFromAPI('/top-products'),
            fetchFromAPI('/segment-revenue')
        ]);

        // Render all charts for the first time
        renderAllCharts();

        console.log('Dashboard loaded successfully!');
    } catch (error) {
        console.error('Fatal error loading dashboard:', error);
        const header = document.querySelector('header');
        const errorDiv = document.createElement('div');
        errorDiv.className = 'error-message bg-red-100 dark:bg-red-900 border border-red-400 text-red-700 dark:text-red-200 px-4 py-3 rounded-lg relative text-center mb-4';
        errorDiv.textContent = 'Could not load dashboard data. Please ensure the backend server is running and accessible.';
        header.insertAdjacentElement('afterend', errorDiv);
    }
}

function renderAllCharts() {
    if (monthlyRevenueData) renderMonthlyRevenueChart();
    if (topProductsData) renderTopProductsChart();
    if (segmentRevenueData) renderSegmentRevenueChart();
}


/**
 * =================================================================
 * CHART CONFIGURATION & UTILITY FUNCTIONS
 * =================================================================
 */

function getChartThemeOptions() {
    const isDarkMode = document.documentElement.classList.contains('dark');
    const gridColor = isDarkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)';
    const textColor = isDarkMode ? '#E5E7EB' : '#374151'; // gray-200 : gray-700

    return {
        plugins: {
            legend: {
                labels: { color: textColor, boxWidth: 12, padding: 20 }
            },
            tooltip: {
                bodyColor: textColor,
                titleColor: textColor,
                backgroundColor: isDarkMode ? 'rgba(31, 41, 55, 0.8)' : 'rgba(255, 255, 255, 0.8)',
                borderColor: gridColor
            }
        },
        scales: {
            y: {
                ticks: { color: textColor, font: { size: 12 } },
                grid: { color: gridColor }
            },
            x: {
                ticks: { color: textColor, font: { size: 12 } },
                grid: { color: gridColor }
            }
        }
    };
}


function formatCurrency(value) {
    return new Intl.NumberFormat('id-ID', {
        style: 'currency', currency: 'IDR', minimumFractionDigits: 0, maximumFractionDigits: 0
    }).format(value);
}

async function fetchFromAPI(endpoint) {
    try {
        const response = await fetch(`${API_BASE_URL}${endpoint}`);
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ error: 'Unknown API error' }));
            throw new Error(`API request failed with status ${response.status}: ${errorData.error}`);
        }
        return await response.json();
    } catch (error) {
        console.error(`Error fetching from ${endpoint}:`, error);
        throw error;
    }
}


/**
 * =================================================================
 * KPI & CHART RENDERING FUNCTIONS
 * =================================================================
 */

async function loadKPIs() {
    try {
        const kpiData = await fetchFromAPI('/kpi');
        document.getElementById('total-revenue').textContent = formatCurrency(kpiData.total_revenue);
        document.getElementById('total-customers').textContent = kpiData.total_customers.toLocaleString('id-ID');
        document.getElementById('new-leads').textContent = kpiData.new_leads.toLocaleString('id-ID');
    } catch (error) {
        console.error('Error loading KPIs:', error);
        ['total-revenue', 'total-customers', 'new-leads'].forEach(id => {
            document.getElementById(id).innerHTML = `<span class="text-sm text-red-500">Error loading data</span>`;
        });
    }
}

function renderMonthlyRevenueChart() {
    const labels = monthlyRevenueData.map(item => {
        const [year, month] = item.date.split('-');
        return new Date(year, month - 1).toLocaleDateString('id-ID', { month: 'short', year: '2-digit' });
    });
    const revenues = monthlyRevenueData.map(item => item.revenue);
    const ctx = document.getElementById('monthlyRevenueChart').getContext('2d');

    const themeOptions = getChartThemeOptions();
    if (monthlyRevenueChart) monthlyRevenueChart.destroy();
    
    monthlyRevenueChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels,
            datasets: [{
                label: 'Pendapatan Bulanan',
                data: revenues,
                backgroundColor: 'rgba(59, 130, 246, 0.2)',
                borderColor: 'rgba(59, 130, 246, 1)',
                borderWidth: 2,
                tension: 0.3,
                pointBackgroundColor: 'rgba(59, 130, 246, 1)',
                pointRadius: 4
            }]
        },
        options: { ...themeOptions, responsive: true, maintainAspectRatio: false, plugins: { ...themeOptions.plugins, legend: { display: false }, tooltip: { ...themeOptions.plugins.tooltip, callbacks: { label: context => formatCurrency(context.raw) } } }, scales: { y: { ...themeOptions.scales.y, beginAtZero: true, ticks: { ...themeOptions.scales.y.ticks, callback: value => formatCurrency(value) } } } }
    });
}

function renderTopProductsChart() {
    const productNames = topProductsData.map(item => item.name);
    const revenues = topProductsData.map(item => item.revenue);
    const ctx = document.getElementById('topProductsChart').getContext('2d');
    
    const themeOptions = getChartThemeOptions();
    if (topProductsChart) topProductsChart.destroy();

    topProductsChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: productNames,
            datasets: [{
                label: 'Pendapatan',
                data: revenues,
                backgroundColor: ['rgba(239, 68, 68, 0.7)', 'rgba(59, 130, 246, 0.7)', 'rgba(234, 179, 8, 0.7)', 'rgba(16, 185, 129, 0.7)', 'rgba(139, 92, 246, 0.7)'],
            }]
        },
        options: { ...themeOptions, indexAxis: 'y', responsive: true, maintainAspectRatio: false, plugins: { ...themeOptions.plugins, legend: { display: false }, tooltip: { ...themeOptions.plugins.tooltip, callbacks: { label: context => formatCurrency(context.raw) } } }, scales: { x: { ...themeOptions.scales.x, beginAtZero: true, ticks: { ...themeOptions.scales.x.ticks, callback: value => formatCurrency(value) } } } }
    });
}

function renderSegmentRevenueChart() {
    const segmentNames = segmentRevenueData.map(item => item.name);
    const revenues = segmentRevenueData.map(item => item.revenue);
    const totalRevenue = revenues.reduce((sum, value) => sum + value, 0);
    const ctx = document.getElementById('segmentRevenueChart').getContext('2d');
    
    const themeOptions = getChartThemeOptions();
    if (segmentRevenueChart) segmentRevenueChart.destroy();

    segmentRevenueChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: segmentNames,
            datasets: [{
                data: revenues,
                backgroundColor: ['rgba(239, 68, 68, 0.7)', 'rgba(59, 130, 246, 0.7)', 'rgba(234, 179, 8, 0.7)', 'rgba(16, 185, 129, 0.7)', 'rgba(139, 92, 246, 0.7)', 'rgba(249, 115, 22, 0.7)'],
                borderColor: document.documentElement.classList.contains('dark') ? '#1F2937' : '#FFFFFF' // gray-800 or white
            }]
        },
        options: { ...themeOptions, responsive: true, maintainAspectRatio: false, cutout: '60%', plugins: { ...themeOptions.plugins, legend: { ...themeOptions.plugins.legend, position: 'right' }, tooltip: { ...themeOptions.plugins.tooltip, callbacks: { label: function(context) { const percentage = (context.raw / totalRevenue * 100).toFixed(1); return `${context.label}: ${formatCurrency(context.raw)} (${percentage}%)`; } } } } }
    });
}