/* ==========================================
   GST Invoice Billing System - script.js
========================================== */

document.addEventListener("DOMContentLoaded", function () {
    // Select Elements
    const body = document.body;
    const themeBtn = document.getElementById("themeBtn");
    const printBtn = document.getElementById("printBtn");
    const clearBtn = document.getElementById("clearBtn");

    const invoiceNo = document.getElementById("invoiceNo");
    const invoiceDate = document.getElementById("invoiceDate");

    const addProduct = document.getElementById("addProduct");
    const productBody = document.getElementById("productBody");

    const subtotal = document.getElementById("subtotal");
    const discount = document.getElementById("discount");
    const discountPercentLabel = document.getElementById("discountPercentLabel");
    const discountAmount = document.getElementById("discountAmount");
    const taxableValue = document.getElementById("taxableValue");
    const gst = document.getElementById("gst");
    const gstType = document.getElementById("gstType");
    const gstAmount = document.getElementById("gstAmount");
    const grandTotal = document.getElementById("grandTotal");
    const splitGST = document.getElementById("splitGST");
    const amountWords = document.getElementById("amountWords");

    const saveInvoiceBtn = document.getElementById("saveInvoice");
    const historyBody = document.getElementById("historyBody");
    const searchInvoice = document.getElementById("searchInvoice");

    // Company and Customer inputs
    const companyFields = ["companyName", "companyGST", "companyPhone", "companyEmail", "companyAddress"];
    const customerFields = ["customerName", "customerPhone", "customerGST", "customerEmail", "customerAddress"];

    // Regex Checkers
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const gstRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;

    // State Variable for Tracking Currently Edited Invoice
    let activeEditingInvoiceNo = null;

    // ===============================
    // Theme Loader
    // ===============================
    function initTheme() {
        const savedTheme = localStorage.getItem("theme") || "light";
        if (savedTheme === "dark") {
            body.classList.add("dark");
            themeBtn.innerHTML = '<i class="fa-solid fa-sun"></i>';
        } else {
            body.classList.remove("dark");
            themeBtn.innerHTML = '<i class="fa-solid fa-moon"></i>';
        }
    }
    initTheme();

    themeBtn.addEventListener("click", function () {
        body.classList.toggle("dark");
        if (body.classList.contains("dark")) {
            localStorage.setItem("theme", "dark");
            themeBtn.innerHTML = '<i class="fa-solid fa-sun"></i>';
        } else {
            localStorage.setItem("theme", "light");
            themeBtn.innerHTML = '<i class="fa-solid fa-moon"></i>';
        }
    });

    // ===============================
    // Invoice Meta Generation
    // ===============================
    function generateInvoiceNo() {
        if (activeEditingInvoiceNo) {
            invoiceNo.value = activeEditingInvoiceNo;
            return;
        }
        const rand = Math.floor(1000 + Math.random() * 9000);
        invoiceNo.value = "INV-" + new Date().getFullYear() + "-" + rand;
    }

    function setInvoiceDate() {
        const today = new Date();
        invoiceDate.value = today.toISOString().split("T")[0];
    }

    // ===============================
    // Restrict Input Hooks (Numeric and Length Validation)
    // ===============================
    function enforceNumericInputs() {
        const phoneIds = ["companyPhone", "customerPhone"];
        phoneIds.forEach(id => {
            const input = document.getElementById(id);
            if (!input) return;
            input.addEventListener("keydown", function(e) {
                if (
                    e.key === "Backspace" || e.key === "Delete" || 
                    e.key === "Tab" || e.key === "Escape" || e.key === "Enter" ||
                    e.key === "ArrowLeft" || e.key === "ArrowRight"
                ) {
                    return; 
                }
                if (!/[0-9]/.test(e.key)) {
                    e.preventDefault();
                }
            });
            input.addEventListener("input", function() {
                this.value = this.value.replace(/[^0-9]/g, '');
                if (this.value.length > 10) {
                    this.value = this.value.substring(0, 10);
                }
            });
        });

        const gstIds = ["companyGST", "customerGST"];
        gstIds.forEach(id => {
            const input = document.getElementById(id);
            if (!input) return;
            input.addEventListener("input", function() {
                this.value = this.value.toUpperCase();
                if (this.value.length > 15) {
                    this.value = this.value.substring(0, 15);
                }
            });
        });
    }

    // ===============================
    // Adding Products UI
    // ===============================
    function addProductRow(data = {}) {
        const row = document.createElement("tr");
        row.innerHTML = `
            <td class="rowNumber"></td>
            <td>
                <input type="text" class="productName" placeholder="Product Name" value="${data.name || ''}">
            </td>
            <td>
                <input type="text" class="hsn" placeholder="HSN Code" value="${data.hsn || ''}">
            </td>
            <td>
                <input type="text" class="unit" placeholder="e.g. PCS, BOX" value="${data.unit || 'PCS'}">
            </td>
            <td>
                <input type="number" class="qty" value="${data.qty !== undefined ? data.qty : 1}" min="0.001" step="any">
            </td>
            <td>
                <input type="number" class="price" value="${data.price !== undefined ? data.price : 0}" min="0" step="any">
            </td>
            <td>
                ₹<span class="lineTotal">0.00</span>
            </td>
            <td>
                <button type="button" class="deleteRow" title="Delete Row">
                    <i class="fa-solid fa-trash"></i>
                </button>
            </td>
        `;

        productBody.appendChild(row);
        updateRowNumbers();
        attachRowEvents(row);
        updateRowTotal(row);
    }

    function updateRowNumbers() {
        const rows = document.querySelectorAll("#productBody tr");
        rows.forEach((row, index) => {
            const numEl = row.querySelector(".rowNumber");
            if (numEl) numEl.textContent = index + 1;
        });
    }

    function attachRowEvents(row) {
        const qty = row.querySelector(".qty");
        const price = row.querySelector(".price");
        const pName = row.querySelector(".productName");
        const deleteBtn = row.querySelector(".deleteRow");

        if (qty) {
            qty.addEventListener("input", () => {
                validatePositiveInput(qty, false);
                updateRowTotal(row);
            });
        }

        if (price) {
            price.addEventListener("input", () => {
                validatePositiveInput(price, true);
                updateRowTotal(row);
            });
        }

        if (pName) {
            pName.addEventListener("input", () => {
                if (pName.value.trim() !== "") {
                    pName.classList.remove("is-invalid");
                }
            });
        }

        if (deleteBtn) {
            deleteBtn.addEventListener("click", () => {
                row.remove();
                updateRowNumbers();
                calculateBill();
            });
        }
    }

    function validatePositiveInput(element, allowZero) {
        let val = parseFloat(element.value);
        if (isNaN(val) || val < 0 || (!allowZero && val === 0)) {
            element.classList.add("is-invalid");
        } else {
            element.classList.remove("is-invalid");
        }
    }

    function updateRowTotal(row) {
        const qtyEl = row.querySelector(".qty");
        const priceEl = row.querySelector(".price");
        const totalEl = row.querySelector(".lineTotal");
        
        const qty = qtyEl ? (parseFloat(qtyEl.value) || 0) : 0;
        const price = priceEl ? (parseFloat(priceEl.value) || 0) : 0;
        const total = qty * price;
        if (totalEl) totalEl.textContent = total.toFixed(2);
        calculateBill();
    }

    // ===============================
    // Dynamic Form Field Validation
    // ===============================
    function validateInput(element, condition) {
        if (!element) return true;
        if (condition) {
            element.classList.remove("is-invalid");
            return true;
        } else {
            element.classList.add("is-invalid");
            return false;
        }
    }

    function addValidationListeners() {
        const compEmail = document.getElementById("companyEmail");
        if (compEmail) {
            compEmail.addEventListener("input", function() {
                validateInput(this, emailRegex.test(this.value.trim()));
            });
        }
        const compPhone = document.getElementById("companyPhone");
        if (compPhone) {
            compPhone.addEventListener("input", function() {
                validateInput(this, this.value.trim().length === 10);
            });
        }
        const compGST = document.getElementById("companyGST");
        if (compGST) {
            compGST.addEventListener("input", function() {
                validateInput(this, gstRegex.test(this.value.trim()));
            });
        }
        const custEmail = document.getElementById("customerEmail");
        if (custEmail) {
            custEmail.addEventListener("input", function() {
                if (this.value.trim() !== "") {
                    validateInput(this, emailRegex.test(this.value.trim()));
                } else {
                    this.classList.remove("is-invalid");
                }
            });
        }
        const custPhone = document.getElementById("customerPhone");
        if (custPhone) {
            custPhone.addEventListener("input", function() {
                validateInput(this, this.value.trim().length === 10);
            });
        }
        const custGST = document.getElementById("customerGST");
        if (custGST) {
            custGST.addEventListener("input", function() {
                if (this.value.trim() !== "") {
                    validateInput(this, gstRegex.test(this.value.trim()));
                } else {
                    this.classList.remove("is-invalid");
                }
            });
        }
    }

    function performFormValidation() {
        let isValid = true;

        isValid &= validateInput(document.getElementById("companyName"), document.getElementById("companyName").value.trim() !== "");
        isValid &= validateInput(document.getElementById("companyGST"), gstRegex.test(document.getElementById("companyGST").value.trim()));
        isValid &= validateInput(document.getElementById("companyPhone"), document.getElementById("companyPhone").value.trim().length === 10);
        isValid &= validateInput(document.getElementById("companyEmail"), emailRegex.test(document.getElementById("companyEmail").value.trim()));
        isValid &= validateInput(document.getElementById("companyAddress"), document.getElementById("companyAddress").value.trim() !== "");

        isValid &= validateInput(document.getElementById("customerName"), document.getElementById("customerName").value.trim() !== "");
        isValid &= validateInput(document.getElementById("customerPhone"), document.getElementById("customerPhone").value.trim().length === 10);
        isValid &= validateInput(document.getElementById("customerAddress"), document.getElementById("customerAddress").value.trim() !== "");

        const custEmail = document.getElementById("customerEmail");
        if (custEmail && custEmail.value.trim() !== "") {
            isValid &= validateInput(custEmail, emailRegex.test(custEmail.value.trim()));
        } else if (custEmail) {
            custEmail.classList.remove("is-invalid");
        }

        const custGST = document.getElementById("customerGST");
        if (custGST && custGST.value.trim() !== "") {
            isValid &= validateInput(custGST, gstRegex.test(custGST.value.trim()));
        } else if (custGST) {
            custGST.classList.remove("is-invalid");
        }

        const rows = document.querySelectorAll("#productBody tr");
        if (rows.length === 0) {
            showToast("Please add at least one product", true);
            isValid = false;
        }

        rows.forEach((row) => {
            const nameEl = row.querySelector(".productName");
            const qtyEl = row.querySelector(".qty");
            const priceEl = row.querySelector(".price");

            if (nameEl) isValid &= validateInput(nameEl, nameEl.value.trim() !== "");
            if (qtyEl) isValid &= validateInput(qtyEl, parseFloat(qtyEl.value) > 0);
            if (priceEl) isValid &= validateInput(priceEl, parseFloat(priceEl.value) >= 0);
        });

        return !!isValid;
    }

    // ===============================
    // Calculations Engine
    // ===============================
    function calculateBill() {
        let subtotalAccumulator = 0;
        const rows = document.querySelectorAll("#productBody tr");

        rows.forEach(row => {
            const totalEl = row.querySelector(".lineTotal");
            const lineValue = totalEl ? (parseFloat(totalEl.textContent) || 0) : 0;
            subtotalAccumulator += lineValue;
        });

        if (subtotal) subtotal.textContent = "₹" + subtotalAccumulator.toFixed(2);

        let discPercent = discount ? (parseFloat(discount.value) || 0) : 0;
        if (discPercent < 0) {
            discPercent = 0;
            if (discount) discount.value = 0;
        } else if (discPercent > 100) {
            discPercent = 100;
            if (discount) discount.value = 100;
        }
        if (discountPercentLabel) discountPercentLabel.textContent = discPercent.toFixed(2);

        const discountValueComputed = (subtotalAccumulator * discPercent) / 100;
        if (discountAmount) discountAmount.textContent = "₹" + discountValueComputed.toFixed(2);

        const computedTaxableVal = subtotalAccumulator - discountValueComputed;
        if (taxableValue) taxableValue.textContent = "₹" + computedTaxableVal.toFixed(2);

        const gstSelected = gst ? (parseFloat(gst.value) || 0) : 0;
        const computedGST = (computedTaxableVal * gstSelected) / 100;
        if (gstAmount) gstAmount.textContent = "₹" + computedGST.toFixed(2);

        let cgstAmt = 0;
        let sgstAmt = 0;
        let igstAmt = 0;

        if (gstType && gstType.value === "cgst") {
            const splitVal = computedGST / 2;
            cgstAmt = splitVal;
            sgstAmt = splitVal;
            if (splitGST) splitGST.innerHTML = `CGST (${(gstSelected / 2).toFixed(1)}%): ₹${splitVal.toFixed(2)} | SGST (${(gstSelected / 2).toFixed(1)}%): ₹${splitVal.toFixed(2)}`;
        } else {
            igstAmt = computedGST;
            if (splitGST) splitGST.innerHTML = `IGST (${gstSelected}%): ₹${computedGST.toFixed(2)}`;
        }

        const computedGrandTotal = computedTaxableVal + computedGST;
        if (grandTotal) grandTotal.textContent = computedGrandTotal.toFixed(2);

        if (amountWords) amountWords.textContent = numberToWords(Math.round(computedGrandTotal)) + " Rupees Only";

        return {
            subtotal: subtotalAccumulator.toFixed(2),
            discountPercent: discPercent,
            discountAmount: discountValueComputed.toFixed(2),
            taxableValue: computedTaxableVal.toFixed(2),
            gstRate: gstSelected,
            gstType: gstType ? gstType.value : "cgst",
            cgstAmount: cgstAmt.toFixed(2),
            sgstAmount: sgstAmt.toFixed(2),
            igstAmount: igstAmt.toFixed(2),
            gstAmount: computedGST.toFixed(2),
            grandTotal: computedGrandTotal.toFixed(2),
            amountWords: amountWords ? amountWords.textContent : ""
        };
    }

    // ===============================
    // Auto-Save Company Metadata
    // ===============================
    function setupCompanyAutoSave() {
        companyFields.forEach(id => {
            const input = document.getElementById(id);
            if (!input) return;
            input.value = localStorage.getItem("backup_" + id) || "";
            input.addEventListener("input", () => {
                localStorage.setItem("backup_" + id, input.value);
            });
        });
    }

    // ===============================
    // Indian Currency Number to Words
    // ===============================
    function numberToWords(num) {
        if (num === 0) return "Zero";
        const ones = ["", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen"];
        const tens = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];

        function convertUnderThousand(n) {
            if (n < 20) return ones[n];
            const ten = Math.floor(n / 10);
            const remainder = n % 10;
            return tens[ten] + (remainder ? " " + ones[remainder] : "");
        }

        let wordStr = "";
        const crore = Math.floor(num / 10000000);
        num %= 10000000;
        const lakh = Math.floor(num / 100000);
        num %= 100000;
        const thousand = Math.floor(num / 1000);
        num %= 1000;
        const hundred = Math.floor(num / 100);
        const remainder = num % 100;

        if (crore) {
            wordStr += numberToWords(crore) + " Crore ";
        }
        if (lakh) {
            wordStr += convertUnderThousand(lakh) + " Lakh ";
        }
        if (thousand) {
            wordStr += convertUnderThousand(thousand) + " Thousand ";
        }
        if (hundred) {
            wordStr += ones[hundred] + " Hundred ";
        }
        if (remainder) {
            wordStr += convertUnderThousand(remainder);
        }
        return wordStr.trim();
    }

    // ===============================
    // LocalStorage CRUD Actions
    // ===============================
    function saveInvoiceData() {
        if (!performFormValidation()) {
            showToast("Please fix the errors highlighted in red.", true);
            return;
        }

        let invoices = [];
        try {
            const data = localStorage.getItem("gstInvoices");
            invoices = data ? JSON.parse(data) : [];
            if (!Array.isArray(invoices)) invoices = [];
        } catch (e) {
            invoices = [];
        }

        const productRows = [];
        document.querySelectorAll("#productBody tr").forEach(row => {
            const nameEl = row.querySelector(".productName");
            const hsnEl = row.querySelector(".hsn");
            const unitEl = row.querySelector(".unit");
            const qtyEl = row.querySelector(".qty");
            const priceEl = row.querySelector(".price");
            const totalEl = row.querySelector(".lineTotal");

            productRows.push({
                name: nameEl ? nameEl.value : "",
                hsn: hsnEl ? hsnEl.value : "",
                unit: unitEl ? unitEl.value : "PCS",
                qty: qtyEl ? (parseFloat(qtyEl.value) || 0) : 0,
                price: priceEl ? (parseFloat(priceEl.value) || 0) : 0,
                total: totalEl ? (parseFloat(totalEl.textContent) || 0) : 0
            });
        });

        const calc = calculateBill();

        const invoiceObject = {
            invoiceNo: invoiceNo.value,
            invoiceDate: invoiceDate.value,
            company: {
                name: document.getElementById("companyName").value,
                gst: document.getElementById("companyGST").value,
                phone: document.getElementById("companyPhone").value,
                email: document.getElementById("companyEmail").value,
                address: document.getElementById("companyAddress").value
            },
            customer: {
                name: document.getElementById("customerName").value,
                gst: document.getElementById("customerGST").value,
                phone: document.getElementById("customerPhone").value,
                email: document.getElementById("customerEmail").value,
                address: document.getElementById("customerAddress").value
            },
            products: productRows,
            summary: {
                subtotal: calc.subtotal,
                discountPercent: calc.discountPercent,
                discountAmount: calc.discountAmount,
                taxableValue: calc.taxableValue,
                gstRate: calc.gstRate,
                gstType: calc.gstType,
                cgstAmount: calc.cgstAmount,
                sgstAmount: calc.sgstAmount,
                igstAmount: calc.igstAmount,
                gstAmount: calc.gstAmount,
                grandTotal: calc.grandTotal,
                amountWords: calc.amountWords
            }
        };

        if (activeEditingInvoiceNo) {
            const index = invoices.findIndex(inv => inv && inv.invoiceNo === activeEditingInvoiceNo);
            if (index !== -1) {
                invoices[index] = invoiceObject;
                showToast("Invoice Updated Successfully!");
            } else {
                invoices.unshift(invoiceObject);
                showToast("Invoice Saved Successfully!");
            }
            activeEditingInvoiceNo = null;
        } else {
            if (invoices.some(inv => inv && inv.invoiceNo === invoiceObject.invoiceNo)) {
                generateInvoiceNo();
                invoiceObject.invoiceNo = invoiceNo.value;
            }
            invoices.unshift(invoiceObject);
            showToast("Invoice Saved Successfully!");
        }

        localStorage.setItem("gstInvoices", JSON.stringify(invoices));
        
        resetInvoiceEditor(false); 
        loadInvoicesHistory();
    }

    function loadInvoicesHistory() {
        if (!historyBody) return;
        historyBody.innerHTML = "";
        
        let invoices = [];
        try {
            const data = localStorage.getItem("gstInvoices");
            invoices = data ? JSON.parse(data) : [];
            if (!Array.isArray(invoices)) invoices = [];
        } catch (e) {
            invoices = [];
        }

        if (invoices.length === 0) {
            historyBody.innerHTML = '<tr><td colspan="5" style="text-align:center;">No Invoices Found</td></tr>';
            return;
        }

        invoices.forEach((invoice, index) => {
            if (!invoice) return;
            const row = document.createElement("tr");
            row.innerHTML = `
                <td><b>${invoice.invoiceNo || ''}</b></td>
                <td>${(invoice.customer && invoice.customer.name) || ''}</td>
                <td>${invoice.invoiceDate || ''}</td>
                <td>₹${(invoice.summary && invoice.summary.grandTotal) || '0.00'}</td>
                <td>
                    <button class="viewBtn" data-index="${index}" title="View Invoice"><i class="fa-solid fa-eye"></i> View</button>
                    <button class="editBtn" data-index="${index}" title="Edit Invoice"><i class="fa-solid fa-edit"></i> Edit</button>
                    <button class="deleteBtn" data-index="${index}" title="Delete Record"><i class="fa-solid fa-trash"></i> Delete</button>
                </td>
            `;
            historyBody.appendChild(row);
        });

        attachHistoryRowActionEvents();
    }

    function attachHistoryRowActionEvents() {
        const getLatestInvoices = () => {
            try {
                const data = localStorage.getItem("gstInvoices");
                const parsed = data ? JSON.parse(data) : [];
                return Array.isArray(parsed) ? parsed : [];
            } catch (e) {
                return [];
            }
        };

        document.querySelectorAll(".viewBtn").forEach(btn => {
            btn.addEventListener("click", function () {
                const idx = this.dataset.index;
                const invoice = getLatestInvoices()[idx];
                if (invoice) {
                    loadInvoiceToForm(invoice);
                    showToast("Invoice Loaded into Form for Viewing.");
                }
            });
        });

        document.querySelectorAll(".editBtn").forEach(btn => {
            btn.addEventListener("click", function () {
                const idx = this.dataset.index;
                const invoice = getLatestInvoices()[idx];
                if (invoice) {
                    loadInvoiceToForm(invoice);
                }
            });
        });

        document.querySelectorAll(".deleteBtn").forEach(btn => {
            btn.addEventListener("click", function () {
                if (confirm("Are you sure you want to delete this invoice?")) {
                    const idx = this.dataset.index;
                    const list = getLatestInvoices();
                    list.splice(idx, 1);
                    localStorage.setItem("gstInvoices", JSON.stringify(list));
                    showToast("Invoice Deleted.");
                    loadInvoicesHistory();
                }
            });
        });
    }

    function loadInvoiceToForm(invoice) {
        if (!invoice) return;
        activeEditingInvoiceNo = invoice.invoiceNo;
        if (invoiceNo) invoiceNo.value = invoice.invoiceNo || '';
        if (invoiceDate) invoiceDate.value = invoice.invoiceDate || '';

        if (invoice.company) {
            const cName = document.getElementById("companyName");
            const cGst = document.getElementById("companyGST");
            const cPhone = document.getElementById("companyPhone");
            const cEmail = document.getElementById("companyEmail");
            const cAddress = document.getElementById("companyAddress");

            if (cName) cName.value = invoice.company.name || '';
            if (cGst) cGst.value = invoice.company.gst || '';
            if (cPhone) cPhone.value = invoice.company.phone || '';
            if (cEmail) cEmail.value = invoice.company.email || '';
            if (cAddress) cAddress.value = invoice.company.address || '';
        }

        if (invoice.customer) {
            const custName = document.getElementById("customerName");
            const custGst = document.getElementById("customerGST");
            const custPhone = document.getElementById("customerPhone");
            const custEmail = document.getElementById("customerEmail");
            const custAddress = document.getElementById("customerAddress");

            if (custName) custName.value = invoice.customer.name || '';
            if (custGst) custGst.value = invoice.customer.gst || '';
            if (custPhone) custPhone.value = invoice.customer.phone || '';
            if (custEmail) custEmail.value = invoice.customer.email || '';
            if (custAddress) custAddress.value = invoice.customer.address || '';
        }

        if (invoice.summary) {
            if (discount) discount.value = invoice.summary.discountPercent !== undefined ? invoice.summary.discountPercent : 0;
            if (gst) gst.value = invoice.summary.gstRate !== undefined ? invoice.summary.gstRate : 18;
            if (gstType) gstType.value = invoice.summary.gstType || 'cgst';
        }

        if (productBody) {
            productBody.innerHTML = "";
            if (Array.isArray(invoice.products)) {
                invoice.products.forEach(prod => {
                    addProductRow(prod);
                });
            }
        }

        calculateBill();
        showToast("Invoice Loaded into Form.");
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    // ===============================
    // Print Layout Generator (A4 Canvas)
    // ===============================
    function triggerPrintInvoice(invoice) {
        const printContainer = document.getElementById("print-invoice-page");
        if (!printContainer || !invoice) return;
        
        let rowsHtml = "";
        if (Array.isArray(invoice.products)) {
            invoice.products.forEach((prod, index) => {
                rowsHtml += `
                    <tr>
                        <td style="text-align: center;">${index + 1}</td>
                        <td><b>${prod.name || ''}</b></td>
                        <td style="text-align: center;">${prod.hsn || '-'}</td>
                        <td style="text-align: center;">${prod.unit || 'PCS'}</td>
                        <td style="text-align: right;">${parseFloat(prod.qty || 0).toFixed(2)}</td>
                        <td style="text-align: right;">₹${parseFloat(prod.price || 0).toFixed(2)}</td>
                        <td style="text-align: right;">₹${parseFloat(prod.total || 0).toFixed(2)}</td>
                    </tr>
                `;
            });
        }

        const rate = invoice.summary ? (parseFloat(invoice.summary.gstRate) || 0) : 0;
        const totalTaxAmount = invoice.summary ? (parseFloat(String(invoice.summary.gstAmount).replace('₹', '')) || 0) : 0;
        let taxBreakdownRows = "";

        if (invoice.summary && invoice.summary.gstType === "cgst") {
            const halvedVal = totalTaxAmount / 2;
            taxBreakdownRows = `
                <tr>
                    <td>CGST (${(rate / 2).toFixed(1)}%)</td>
                    <td style="text-align: right;">₹${halvedVal.toFixed(2)}</td>
                </tr>
                <tr>
                    <td>SGST (${(rate / 2).toFixed(1)}%)</td>
                    <td style="text-align: right;">₹${halvedVal.toFixed(2)}</td>
                </tr>
            `;
        } else {
            taxBreakdownRows = `
                <tr>
                    <td>IGST (${rate}%)</td>
                    <td style="text-align: right;">₹${totalTaxAmount.toFixed(2)}</td>
                </tr>
            `;
        }

        printContainer.innerHTML = `
            <div class="invoice-printable">
                <div class="print-header">
                    <div class="print-comp-info">
                        <div class="print-comp-logo">${(invoice.company && invoice.company.name) || ''}</div>
                        <p style="margin-top: 5px; white-space: pre-line;">${(invoice.company && invoice.company.address) || ''}</p>
                        <p><strong>Phone:</strong> ${(invoice.company && invoice.company.phone) || ''}</p>
                        <p><strong>Email:</strong> ${(invoice.company && invoice.company.email) || ''}</p>
                        <p><strong>GSTIN:</strong> ${(invoice.company && invoice.company.gst && invoice.company.gst.toUpperCase()) || ''}</p>
                    </div>
                    <div class="print-invoice-title">
                        <h1>TAX INVOICE</h1>
                        <table class="print-invoice-meta-table">
                            <tr>
                                <td><strong>Invoice No:</strong></td>
                                <td>${invoice.invoiceNo || ''}</td>
                            </tr>
                            <tr>
                                <td><strong>Date:</strong></td>
                                <td>${invoice.invoiceDate || ''}</td>
                            </tr>
                            <tr>
                                <td><strong>State:</strong></td>
                                <td>Local Jurisdiction</td>
                            </tr>
                        </table>
                    </div>
                </div>

                <div class="print-meta-grid">
                    <div class="meta-box">
                        <h3>Billed To (Customer):</h3>
                        <p><strong>${(invoice.customer && invoice.customer.name) || ''}</strong></p>
                        <p style="white-space: pre-line; margin: 4px 0;">${(invoice.customer && invoice.customer.address) || ''}</p>
                        <p><strong>Phone:</strong> ${(invoice.customer && invoice.customer.phone) || ''}</p>
                        ${invoice.customer && invoice.customer.email ? `<p><strong>Email:</strong> ${invoice.customer.email}</p>` : ''}
                        ${invoice.customer && invoice.customer.gst ? `<p><strong>GSTIN:</strong> ${invoice.customer.gst.toUpperCase()}</p>` : '<p><strong>GSTIN:</strong> URD (Unregistered Person)</p>'}
                    </div>
                </div>

                <table class="print-table">
                    <thead>
                        <tr>
                            <th style="width: 6%; text-align: center;">Sr No</th>
                            <th style="width: 39%;">Product Name</th>
                            <th style="width: 13%; text-align: center;">HSN Code</th>
                            <th style="width: 10%; text-align: center;">Unit</th>
                            <th style="width: 10%; text-align: right;">Qty</th>
                            <th style="width: 10%; text-align: right;">Rate</th>
                            <th style="width: 12%; text-align: right;">Amount</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${rowsHtml}
                    </tbody>
                </table>

                <div class="print-summary-container">
                    <div class="summary-left-notes">
                        <div>
                            <p><strong>Amount Chargeable in Words:</strong></p>
                            <p style="font-weight: 600; margin-top: 3px; text-transform: capitalize;">${(invoice.summary && invoice.summary.amountWords) || ''}</p>
                        </div>
                    </div>
                    <div>
                        <table class="print-summary-table">
                            <tr>
                                <td>Subtotal</td>
                                <td style="text-align: right;">₹${(invoice.summary && invoice.summary.subtotal) || '0.00'}</td>
                            </tr>
                            <tr>
                                <td>Discount (${(invoice.summary && invoice.summary.discountPercent) || 0}%)</td>
                                <td style="text-align: right;">-₹${(invoice.summary && invoice.summary.discountAmount) || '0.00'}</td>
                            </tr>
                            <tr>
                                <td>Taxable Value</td>
                                <td style="text-align: right;">₹${(invoice.summary && invoice.summary.taxableValue) || '0.00'}</td>
                            </tr>
                            ${taxBreakdownRows}
                            <tr class="grand-total-row">
                                <td><strong>Grand Total</strong></td>
                                <td style="text-align: right;"><strong>₹${(invoice.summary && invoice.summary.grandTotal) || '0.00'}</strong></td>
                            </tr>
                        </table>
                    </div>
                </div>

                <div class="print-footer-declaration">
                    <h4>Declaration:</h4>
                    <p>We declare that this invoice shows the actual price of the goods described and that all particulars are true and correct.</p>
                    <p style="margin-top: 5px;"><strong>Terms & Conditions:</strong></p>
                    <p>1. Goods once sold will not be taken back or exchanged.</p>
                    <p>2. Interest @18% p.a. will be charged if payment is not made within due timeframe.</p>
                </div>

                <div class="print-signatures">
                    <div class="sig-block">
                        <p>Receiver's Signature</p>
                        <div class="sig-line">Customer Seal & Signature</div>
                    </div>
                    <div class="sig-block">
                        <p style="font-weight:700;">For ${(invoice.company && invoice.company.name) || ''}</p>
                        <div class="sig-line">Authorized Signatory</div>
                    </div>
                </div>
                
                <div class="print-thankyou">
                    Thank You for Your Business!
                </div>
            </div>
        `;

        setTimeout(() => {
            window.print();
        }, 300);
    }

    function triggerActiveFormPrint() {
        if (!performFormValidation()) {
            showToast("Please complete the form requirements first.", true);
            return;
        }

        const activeProductRows = [];
        document.querySelectorAll("#productBody tr").forEach(row => {
            const nameEl = row.querySelector(".productName");
            const hsnEl = row.querySelector(".hsn");
            const unitEl = row.querySelector(".unit");
            const qtyEl = row.querySelector(".qty");
            const priceEl = row.querySelector(".price");
            const totalEl = row.querySelector(".lineTotal");

            activeProductRows.push({
                name: nameEl ? nameEl.value : "",
                hsn: hsnEl ? hsnEl.value : "",
                unit: unitEl ? unitEl.value : "PCS",
                qty: qtyEl ? (parseFloat(qtyEl.value) || 0) : 0,
                price: priceEl ? (parseFloat(priceEl.value) || 0) : 0,
                total: totalEl ? (parseFloat(totalEl.textContent) || 0) : 0
            });
        });

        const calc = calculateBill();

        const currentActiveState = {
            invoiceNo: invoiceNo.value,
            invoiceDate: invoiceDate.value,
            company: {
                name: document.getElementById("companyName").value,
                gst: document.getElementById("companyGST").value,
                phone: document.getElementById("companyPhone").value,
                email: document.getElementById("companyEmail").value,
                address: document.getElementById("companyAddress").value
            },
            customer: {
                name: document.getElementById("customerName").value,
                gst: document.getElementById("customerGST").value,
                phone: document.getElementById("customerPhone").value,
                email: document.getElementById("customerEmail").value,
                address: document.getElementById("customerAddress").value
            },
            products: activeProductRows,
            summary: {
                subtotal: calc.subtotal,
                discountPercent: calc.discountPercent,
                discountAmount: calc.discountAmount,
                taxableValue: calc.taxableValue,
                gstRate: calc.gstRate,
                gstType: calc.gstType,
                cgstAmount: calc.cgstAmount,
                sgstAmount: calc.sgstAmount,
                igstAmount: calc.igstAmount,
                gstAmount: calc.gstAmount,
                grandTotal: calc.grandTotal,
                amountWords: calc.amountWords
            }
        };

        triggerPrintInvoice(currentActiveState);
    }

    // ===============================
    // Global Toast Notification Helper
    // ===============================
    function showToast(message, isError = false) {
        const toast = document.getElementById("toast");
        if (!toast) return;
        toast.textContent = message;
        toast.className = "toast show";
        if (isError) {
            toast.style.background = "var(--danger)";
        } else {
            toast.style.background = "var(--success)";
        }

        setTimeout(() => {
            toast.className = "toast";
        }, 3000);
    }

    // ===============================
    // Clear and Reset Handlers
    // ===============================
    function resetInvoiceEditor(promptConfirm = true) {
        if (promptConfirm && !confirm("Do you want to clear the invoice form? This resets the editor.")) {
            return;
        }

        activeEditingInvoiceNo = null;

        customerFields.forEach(id => {
            const field = document.getElementById(id);
            if (field) {
                field.value = "";
                field.classList.remove("is-invalid");
            }
        });

        companyFields.forEach(id => {
            const field = document.getElementById(id);
            if (field) field.classList.remove("is-invalid");
        });

        if (discount) discount.value = 0;
        if (gst) gst.selectedIndex = 3; 
        if (gstType) gstType.selectedIndex = 0; 

        if (productBody) {
            productBody.innerHTML = "";
            addProductRow();
        }
        generateInvoiceNo();
        setInvoiceDate();
        calculateBill();
    }

    // ===============================
    // History Filtering (Search Engine)
    // ===============================
    if (searchInvoice) {
        searchInvoice.addEventListener("input", function () {
            const query = this.value.toLowerCase().trim();
            if (!historyBody) return;
            const rows = historyBody.querySelectorAll("tr");

            rows.forEach(row => {
                const cells = row.getElementsByTagName("td");
                if (cells.length < 3) return;
                const invIdText = cells[0].textContent.toLowerCase();
                const clientText = cells[1].textContent.toLowerCase();

                if (invIdText.includes(query) || clientText.includes(query)) {
                    row.style.display = "";
                } else {
                    row.style.display = "none";
                }
            });
        });
    }

    // ===============================
    // Keyboard Event Handling Shortcuts
    // ===============================
    document.addEventListener("keydown", function (e) {
        if (e.ctrlKey && e.key === "s") {
            e.preventDefault();
            if (saveInvoiceBtn) saveInvoiceBtn.click();
        }
        if (e.ctrlKey && e.key === "p") {
            e.preventDefault();
            if (printBtn) printBtn.click();
        }
        if (e.ctrlKey && e.altKey && e.key === "n") {
            e.preventDefault();
            if (addProduct) addProduct.click();
        }
    });

    // ===============================
    // Global Registration & Init
    // ===============================
    if (addProduct) addProduct.addEventListener("click", () => addProductRow());
    if (printBtn) printBtn.addEventListener("click", triggerActiveFormPrint);
    if (clearBtn) clearBtn.addEventListener("click", () => resetInvoiceEditor(true));
    if (saveInvoiceBtn) saveInvoiceBtn.addEventListener("click", saveInvoiceData);

    if (discount) discount.addEventListener("input", calculateBill);
    if (gst) gst.addEventListener("change", calculateBill);
    if (gstType) gstType.addEventListener("change", calculateBill);

    // Initial runs
    enforceNumericInputs();
    setupCompanyAutoSave();
    addValidationListeners();
    resetInvoiceEditor(false);
    loadInvoicesHistory();
});