async function fetchData(url) {
    try {
        const response = await fetch(url);
        const data = await response.json();
        return data; 
    } catch (error) {
        console.error('Error:', error);
        return null;
    }
}

class CSVCombobox {
    constructor(csvFilePath, {
        labelColumnIndex = 1,
        valueColumnIndex = 0,
        inputId,
        listId,
        hiddenValueId,
        delimiter = ';',
        multiSelect = false,
        tagsContainerId = null
    } = {}) {
        // DOM Elements
        this.input = document.getElementById(inputId);
        this.optionsList = document.getElementById(listId);
        this.hiddenValueInput = document.getElementById(hiddenValueId);
        this.tagsContainer = tagsContainerId 
            ? document.getElementById(tagsContainerId) 
            : null;
        
        // Configuration
        this.delimiter = delimiter;
        this.labelColumnIndex = labelColumnIndex;
        this.valueColumnIndex = valueColumnIndex;
        this.multiSelect = multiSelect;
        this.csvFilePath = csvFilePath;
        
        // State
        this.selectedValues = new Set();
        this.allOptions = [];
        
        // Initialize asynchronously
        this.init();
    }

    async init() {
        // Add loading state
        this.input.classList.add('loading');
        this.optionsList.classList.add('loading');

        try {
            // Fetch and parse CSV
            await this.parseCSV(this.csvFilePath);
            
            // Setup event listeners and render options
            this.setupEventListeners();
            this.renderOptions();
        } catch (error) {
            console.error('Error initializing combobox:', error);
            this.input.placeholder = 'Error loading options';
        } finally {
            // Remove loading state
            this.input.classList.remove('loading');
            this.optionsList.classList.remove('loading');
        }
    }

    async parseCSV(csvFilePath) {
        const response = await fetch(csvFilePath);
        const csvString = await response.text();
        const rows = csvString.split("\n").map(row => row.trim());
        rows.shift();
        
        // Split CSV into rows and parse each row
        this.allOptions = rows.map(row => row.split(this.delimiter).map(cell => cell.trim()))
            // Filter out empty rows
            .filter(row => row.length > Math.max(this.labelColumnIndex, this.valueColumnIndex));
    }

    renderOptions() {
        this.optionsList.innerHTML = '';
        this.allOptions.forEach(row => {
            const label = row[this.labelColumnIndex];
            const value = row[this.valueColumnIndex];
            
            const optionElement = document.createElement('div');
            optionElement.textContent = label;
            optionElement.dataset.value = value;
            
            // Mark as selected if already in selectedValues
            if (this.selectedValues.has(value)) {
                optionElement.classList.add('selected');
            }
            
            optionElement.addEventListener('click', () => this.selectOption(label, value));
            this.optionsList.appendChild(optionElement);
        });
    }

    setupEventListeners() {
        // Input handling
        this.input.addEventListener('input', (e) => this.filterOptions(e.target.value));
        this.input.addEventListener('focus', () => this.showOptions());
        
        // Close options when clicking outside
        document.addEventListener('click', (e) => {
            if (!this.input.contains(e.target) && !this.optionsList.contains(e.target)) {
                this.hideOptions();
            }
        });
    }

    filterOptions(searchTerm) {
        const filteredOptions = this.allOptions.filter(row => 
            row[this.labelColumnIndex].toLowerCase().includes(searchTerm.toLowerCase())
        );
        
        this.optionsList.innerHTML = '';
        filteredOptions.forEach(row => {
            const label = row[this.labelColumnIndex];
            const value = row[this.valueColumnIndex];
            
            const optionElement = document.createElement('div');
            optionElement.textContent = label;
            optionElement.dataset.value = value;
            
            // Mark as selected if already in selectedValues
            if (this.selectedValues.has(value)) {
                optionElement.classList.add('selected');
            }
            
            optionElement.addEventListener('click', () => this.selectOption(label, value));
            this.optionsList.appendChild(optionElement);
        });
        
        this.showOptions();
    }

    selectOption(label, value) {
        if (this.multiSelect) {
            // Multi-select logic
            if (this.selectedValues.has(value)) {
                // Deselect
                this.selectedValues.delete(value);
                this.updateMultiSelectDisplay();
            } else {
                // Select
                this.selectedValues.add(value);
                this.updateMultiSelectDisplay();
            }
        } else {
            // Single-select logic
            this.selectedValues.clear();
            this.selectedValues.add(value);
            this.input.value = label;
        }

        // Update hidden input with comma-separated values
        this.hiddenValueInput.value = Array.from(this.selectedValues).join(this.delimiter);
        this.hiddenValueInput.dispatchEvent(new Event('change'));
        
        // Re-render options to update selected state
        this.renderOptions();
        
        // Hide options for single-select, keep open for multi-select
        if (!this.multiSelect) {
            this.hideOptions();
        }
    }

    updateMultiSelectDisplay() {
        if (!this.tagsContainer) return;

        // Clear existing tags
        this.tagsContainer.innerHTML = '';

        // Create tags for each selected option
        this.selectedValues.forEach(value => {
            // Find the full row for this value
            const row = this.allOptions.find(r => r[this.valueColumnIndex] === value);
            if (!row) return;

            const label = row[this.labelColumnIndex];
            
            // Create tag element
            const tagElement = document.createElement('div');
            tagElement.classList.add('multi-select-tag');
            tagElement.innerHTML = `
                <span>${label}</span>
                <span class="multi-select-tag-remove" data-value="${value}">×</span>
            `;

            // Add remove functionality
            tagElement.querySelector('.multi-select-tag-remove').addEventListener('click', () => {
                this.selectedValues.delete(value);
                this.updateMultiSelectDisplay();
                this.hiddenValueInput.value = Array.from(this.selectedValues).join(this.delimiter);
                this.hiddenValueInput.dispatchEvent(new Event('change'));
                this.renderOptions();
            });

            this.tagsContainer.appendChild(tagElement);
        });

        // Update input placeholder
        this.input.placeholder = this.selectedValues.size 
            ? `${this.selectedValues.size} избрани` 
            : 'избери партии';
    }

    showOptions() {
        this.optionsList.classList.add('visible');
    }

    hideOptions() {
        this.optionsList.classList.remove('visible');
    }
}

