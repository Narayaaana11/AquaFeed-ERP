const valuesPart = "('Update Timestamp','1/7/2026, 12:30:26 pm'),('Company Name','VIJAYADURGA AQUA FEEDS AND NEEDS(2026-2027)'),('Period From','2026-04-01'),('Period To','2027-03-31'),('Last AlterID Master','123'),('Last AlterID Transaction','456')";
const matches = valuesPart.slice(1, -1).split(/\),\s*\(/g);
console.log(matches);
for (let content of matches) {
    let parts = content.slice(0).split(/,(?=(?:[^']*'[^']*')*[^']*$)/);
    console.log("parts:", parts);
}
