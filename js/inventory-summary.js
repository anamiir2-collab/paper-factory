/* =========================================
   ملخص جرد المخزن
   يجمع البكر حسب:
   المقاس + الجرام + النوع
========================================= */

(function () {
    if (typeof Inventory === 'undefined') return;

    function renderStockSummary() {
        const coils = Storage
            .list('coils')
            .filter(coil => !coil.archived);

        const groups = {};

        coils.forEach(coil => {
            const size = coil.size || '-';
            const gram = coil.gram || coil.grammage || '-';
            const type = coil.type || '-';

            const key = `${size}|${gram}|${type}`;

            if (!groups[key]) {
                groups[key] = {
                    count: 0,
                    size: size,
                    gram: gram,
                    type: type
                };
            }

            groups[key].count++;
        });

        const rows = Object.values(groups)
            .sort((a, b) => {
                return String(a.size).localeCompare(
                    String(b.size),
                    'ar',
                    { numeric: true }
                );
            });

        const total = coils.length;

        const rowsHTML = rows.length
            ? rows.map(item => `
                <tr>
                    <td>
                        <strong>${item.count}</strong>
                    </td>
                    <td>${item.size}</td>
                    <td>${item.gram}</td>
                    <td>${item.type}</td>
                </tr>
            `).join('')
            : `
                <tr>
                    <td colspan="4" style="text-align:center;padding:25px;">
                        لا توجد بكرات في المخزن
                    </td>
                </tr>
            `;

        return `
            <div class="card inventory-stock-summary" style="margin-top:20px;">

                <div style="
                    display:flex;
                    justify-content:space-between;
                    align-items:center;
                    gap:10px;
                    flex-wrap:wrap;
                    margin-bottom:15px;
                ">
                    <div>
                        <h3 style="margin:0;">
                            📋 ملخص جرد المخزن
                        </h3>

                        <small style="opacity:.7;">
                            تجميع البكر حسب المقاس والجرام والنوع
                        </small>
                    </div>

                    <div style="
                        padding:8px 14px;
                        border-radius:10px;
                        background:rgba(194,136,78,.12);
                        font-weight:bold;
                    ">
                        إجمالي البكر: ${total}
                    </div>
                </div>

                <div style="overflow-x:auto;">

                    <table class="data-table" style="width:100%;">

                        <thead>
                            <tr>
                                <th>العدد</th>
                                <th>المقاس</th>
                                <th>الجرام</th>
                                <th>النوع</th>
                            </tr>
                        </thead>

                        <tbody>
                            ${rowsHTML}
                        </tbody>

                    </table>

                </div>

            </div>
        `;
    }

    const originalRender = Inventory.render;

    Inventory.render = function () {

        originalRender.apply(this, arguments);

        setTimeout(() => {

            const container =
                document.getElementById('page-container') ||
                document.querySelector('.page-container') ||
                document.querySelector('main');

            if (!container) return;

            const oldSummary =
                container.querySelector('.inventory-stock-summary');

            if (oldSummary) {
                oldSummary.remove();
            }

            const statsCard =
                Array.from(container.querySelectorAll('.card'))
                    .find(card =>
                        card.textContent.includes('إحصائيات المخزن')
                    );

            const summaryHTML = renderStockSummary();

            if (statsCard) {
                statsCard.insertAdjacentHTML(
                    'beforebegin',
                    summaryHTML
                );
            } else {
                container.insertAdjacentHTML(
                    'beforeend',
                    summaryHTML
                );
            }

        }, 50);
    };

    const originalRefresh = Inventory.refresh;

    if (typeof originalRefresh === 'function') {
        Inventory.refresh = function () {

            originalRefresh.apply(this, arguments);

            setTimeout(() => {
                Inventory.render();
            }, 100);
        };
    }

})();