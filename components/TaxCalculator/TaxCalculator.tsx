// 🚨 This project contains licensed components. Unauthorized use outside this project is prohibited and may result in legal action.
"use client";

import { useState } from "react";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem, SelectGroup, SelectLabel } from "@/components/ui/select";
import { Label } from "../ui/label";
import { Input } from "../ui/input";
import { Button } from "../ui/button";
export default function TaxCalculator() {
  const [taxType, setTaxType] = useState("personal_income_tax");
  const [amount, setAmount] = useState("");
  const [taxRate, setTaxRate] = useState("");
  const [taxOwed, setTaxOwed] = useState<number | null>(null);
  const taxRates = {
    personal_income_tax: 24,
    corporate_tax: 30,
    vat: 7.5,
    withholding_tax: 10,
    capital_gains_tax: 10
  };
  const handleTaxTypeChange = (value: string) => {
    setTaxType(value);
    setTaxRate(taxRates[value].toString());
    setTaxOwed(null);
    setAmount("");
  };
  const handleCalculate = () => {
    if (!amount || !taxRate) {
      alert("Please fill in all the fields.");
      return;
    }
    const parsedAmount = parseFloat(amount);
    const parsedRate = parseFloat(taxRate);
    if (isNaN(parsedAmount) || isNaN(parsedRate)) {
      alert("Please enter valid numbers.");
      return;
    }
    const taxAmount = parsedAmount * parsedRate / 100;
    setTaxOwed(taxAmount);
  };
  return <div className="max-w-lg mx-auto p-6 bg-white shadow-lg rounded-lg">
      <h4 className="text-2xl font-semibold text-gray-700 mb-6">Tax Calculator</h4>

      {}
      <div className="mb-4">
        <Label>Select Tax Type</Label>
        <Select value={taxType} onValueChange={handleTaxTypeChange}>
          <SelectTrigger>
            <SelectValue>
              {taxType === "personal_income_tax" ? "Personal Income Tax" : taxType === "corporate_tax" ? "Corporate Tax" : taxType === "vat" ? "VAT" : taxType === "withholding_tax" ? "Withholding Tax" : taxType === "capital_gains_tax" ? "Capital Gains Tax" : ""}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              <SelectLabel>Tax Types</SelectLabel>
              <SelectItem value="personal_income_tax">Personal Income Tax</SelectItem>
              <SelectItem value="corporate_tax">Corporate Tax</SelectItem>
              <SelectItem value="vat">VAT</SelectItem>
              <SelectItem value="withholding_tax">Withholding Tax</SelectItem>
              <SelectItem value="capital_gains_tax">Capital Gains Tax</SelectItem>
            </SelectGroup>
          </SelectContent>
        </Select>
      </div>

      {}
      <div className="mb-4">
        <Label>Amount</Label>
        <Input type="number" value={amount} onChange={e => setAmount(e.target.value)} placeholder="Enter amount" />
      </div>

      {}
      <div className="mb-4">
        <Label>Tax Rate (%)</Label>
        <Input type="number" value={taxRate} onChange={e => setTaxRate(e.target.value)} placeholder="Tax rate" disabled />
      </div>

      {}
      <Button onClick={handleCalculate} className="w-full bg-green-600 text-white">
        Calculate Tax Owed
      </Button>

      {}
      {taxOwed !== null && <div className="mt-6 text-center text-xl font-semibold text-green-600">
          <p>Tax Owed: ₦{taxOwed.toFixed(2)}</p>
        </div>}

      {}
      <p className="mt-4 text-xs text-gray-500 text-center">
        Please note: This calculator provides an estimate. For precise figures, consult the Federal Inland Revenue Service (FIRS) or a tax professional.
      </p>
    </div>;
}