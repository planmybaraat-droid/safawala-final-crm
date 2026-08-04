const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../app/create-invoice/page.tsx');
let content = fs.readFileSync(filePath, 'utf8');
const lines = content.split('\n');

// Verify lines match
console.log("Line 2608:", lines[2607]); // Index 2607 is line 2608 (1-indexed)
console.log("Line 2639:", lines[2638]);
console.log("Line 2839:", lines[2838]);
console.log("Line 2842:", lines[2841]);
console.log("Line 3001:", lines[3000]);
console.log("Line 3014:", lines[3013]);
console.log("Line 3362:", lines[3361]);
console.log("Line 3375:", lines[3374]);
console.log("Line 3629:", lines[3628]);
console.log("Line 3631:", lines[3630]);

// Let's extract the JSX parts
// We will replace the entire <Tabs> block starting at line 2608 (index 2607) to line 3631 (index 3630)
// First, let's extract the cards
const customerCardLines = lines.slice(2638, 2839).join('\n');
const eventDetailsLines = lines.slice(2841, 3001).join('\n');
const productSelectorLines = lines.slice(3013, 3362).join('\n');
const settlementLines = lines.slice(3374, 3629).join('\n');

// We will insert rendering helper variables right before `return (` (line 2324, index 2323)
const helpers = `
  // Render sub-sections to prevent duplicate code and handle direct sales POS layout
  const renderCustomerCard = () => (
${customerCardLines.split('\n').map(l => '    ' + l).join('\n')}
  );

  const renderEventAndGroomBrideCards = () => (
    <>
${eventDetailsLines.split('\n').map(l => '    ' + l).join('\n')}
    </>
  );

  const renderProductSelectorCards = () => (
    <>
${productSelectorLines.split('\n').map(l => '    ' + l).join('\n')}
    </>
  );

  const renderSettlementCards = () => (
    <>
${settlementLines.split('\n').map(l => '    ' + l).join('\n')}
    </>
  );
`;

// Now let's build the new return block to replace <Tabs> ... </Tabs>
const newTabsBlock = `                {invoiceData.invoice_type === "sale" ? (
                  <div className="space-y-6">
                    {renderCustomerCard()}
                    {renderProductSelectorCards()}
                    {renderSettlementCards()}
                  </div>
                ) : (
                  <Tabs defaultValue="details" className="w-full">
                    <TabsList className="grid grid-cols-3 bg-slate-100 p-1 rounded-lg mb-4 border border-slate-200">
                      <TabsTrigger value="details" className="data-[state=active]:bg-white data-[state=active]:text-indigo-700 data-[state=active]:shadow-sm text-slate-500 rounded-md py-1.5 font-medium text-xs sm:text-sm transition-all flex items-center justify-center gap-1.5">
                        <User className="h-4 w-4" />
                        Details
                      </TabsTrigger>
                      <TabsTrigger value="items" className="data-[state=active]:bg-white data-[state=active]:text-indigo-700 data-[state=active]:shadow-sm text-slate-500 rounded-md py-1.5 font-medium text-xs sm:text-sm transition-all flex items-center justify-center gap-1.5">
                        <Package className="h-4 w-4" />
                        Products
                      </TabsTrigger>
                      <TabsTrigger value="settlement" className="data-[state=active]:bg-white data-[state=active]:text-indigo-700 data-[state=active]:shadow-sm text-slate-500 rounded-md py-1.5 font-medium text-xs sm:text-sm transition-all flex items-center justify-center gap-1.5">
                        <FileCheck className="h-4 w-4" />
                        Settlement
                      </TabsTrigger>
                    </TabsList>

                    {/* TAB 1: CUSTOMER & EVENT DETAILS */}
                    <TabsContent value="details" className="space-y-4 focus-visible:outline-none focus-visible:ring-0">
                      {renderCustomerCard()}
                      {renderEventAndGroomBrideCards()}
                    </TabsContent>

                    {/* TAB 2: PRODUCTS & ITEMS */}
                    <TabsContent value="items" className="space-y-4 focus-visible:outline-none focus-visible:ring-0">
                      {renderProductSelectorCards()}
                    </TabsContent>

                    {/* TAB 3: SETTLEMENT */}
                    <TabsContent value="settlement" className="space-y-4 focus-visible:outline-none focus-visible:ring-0">
                      {renderSettlementCards()}
                    </TabsContent>
                  </Tabs>
                )}`;

// Insert helpers before return statement (line 2324, index 2323)
lines.splice(2323, 0, helpers);

// Find start and end indices of Tabs by scanning the whole lines array
let tabsStartIndex = -1;
let tabsEndIndex = -1;

for (let i = 0; i < lines.length; i++) {
  if (lines[i] && lines[i].includes('<Tabs defaultValue="details" className="w-full">')) {
    tabsStartIndex = i;
    break;
  }
}

// For the end index, we look for </Tabs> after tabsStartIndex
if (tabsStartIndex !== -1) {
  for (let i = tabsStartIndex; i < lines.length; i++) {
    if (lines[i] && lines[i].includes('</Tabs>') && lines[i-1] && lines[i-1].includes('</TabsContent>') && lines[i-2] && lines[i-2].includes('</Card>')) {
      tabsEndIndex = i;
      break;
    }
  }
}

console.log("Found tabsStartIndex:", tabsStartIndex, "Line content:", lines[tabsStartIndex]);
console.log("Found tabsEndIndex:", tabsEndIndex, "Line content:", lines[tabsEndIndex]);

if (tabsStartIndex !== -1 && tabsEndIndex !== -1) {
  // Replace the block of lines between tabsStartIndex and tabsEndIndex (inclusive) with newTabsBlock
  lines.splice(tabsStartIndex, tabsEndIndex - tabsStartIndex + 1, newTabsBlock);
  fs.writeFileSync(filePath, lines.join('\n'), 'utf8');
  console.log("Successfully refactored create-invoice/page.tsx!");
} else {
  console.error("Failed to find Tabs start/end lines!");
}
