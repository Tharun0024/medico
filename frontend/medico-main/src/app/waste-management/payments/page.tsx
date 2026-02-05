"use client";

import { motion } from "framer-motion";
import { useState } from "react";
import {
  DashboardLayout,
  DashboardSection,
  AnimatedCard,
  StatsCard,
  DashboardGrid,
} from "@/components/dashboard";
import {
  CreditCard,
  Search,
  Download,
  Calendar,
  IndianRupee,
  TrendingUp,
  CheckCircle,
  Clock,
  AlertCircle,
  Building,
  FileText,
  Eye,
  Receipt,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { toast } from "sonner";

// Mock payment data
const payments = [
  {
    id: "PAY001",
    hospital: "City General Hospital",
    amount: 12500,
    collections: 8,
    period: "Jan 1-15, 2024",
    status: "paid",
    paidDate: "2024-01-18",
    invoiceNo: "INV-2024-001",
  },
  {
    id: "PAY002",
    hospital: "Apollo Hospital",
    amount: 8750,
    collections: 5,
    period: "Jan 1-15, 2024",
    status: "paid",
    paidDate: "2024-01-17",
    invoiceNo: "INV-2024-002",
  },
  {
    id: "PAY003",
    hospital: "Fortis Hospital",
    amount: 15200,
    collections: 10,
    period: "Jan 1-15, 2024",
    status: "pending",
    paidDate: null,
    invoiceNo: "INV-2024-003",
  },
  {
    id: "PAY004",
    hospital: "Lilavati Hospital",
    amount: 9800,
    collections: 6,
    period: "Jan 1-15, 2024",
    status: "paid",
    paidDate: "2024-01-16",
    invoiceNo: "INV-2024-004",
  },
  {
    id: "PAY005",
    hospital: "Hinduja Hospital",
    amount: 11400,
    collections: 7,
    period: "Jan 1-15, 2024",
    status: "overdue",
    paidDate: null,
    invoiceNo: "INV-2024-005",
  },
  {
    id: "PAY006",
    hospital: "Kokilaben Hospital",
    amount: 13600,
    collections: 9,
    period: "Jan 1-15, 2024",
    status: "pending",
    paidDate: null,
    invoiceNo: "INV-2024-006",
  },
];

// Monthly earnings data
const monthlyEarnings = [
  { month: "Aug", earnings: 45000 },
  { month: "Sep", earnings: 52000 },
  { month: "Oct", earnings: 48000 },
  { month: "Nov", earnings: 61000 },
  { month: "Dec", earnings: 58000 },
  { month: "Jan", earnings: 71250 },
];

const getStatusColor = (status: string) => {
  switch (status) {
    case "paid":
      return "default";
    case "pending":
      return "secondary";
    case "overdue":
      return "destructive";
    default:
      return "secondary";
  }
};

const getStatusIcon = (status: string) => {
  switch (status) {
    case "paid":
      return <CheckCircle className="h-4 w-4 text-green-500" />;
    case "pending":
      return <Clock className="h-4 w-4 text-yellow-500" />;
    case "overdue":
      return <AlertCircle className="h-4 w-4 text-red-500" />;
    default:
      return <Clock className="h-4 w-4" />;
  }
};

export default function PaymentsPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("all");
  const [selectedPayment, setSelectedPayment] = useState<typeof payments[0] | null>(null);

  const filteredPayments = payments.filter((payment) => {
    const matchesSearch =
      payment.hospital.toLowerCase().includes(searchQuery.toLowerCase()) ||
      payment.invoiceNo.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = selectedStatus === "all" || payment.status === selectedStatus;
    return matchesSearch && matchesStatus;
  });

  const totalEarnings = payments.filter((p) => p.status === "paid").reduce((sum, p) => sum + p.amount, 0);
  const pendingAmount = payments.filter((p) => p.status === "pending").reduce((sum, p) => sum + p.amount, 0);
  const overdueAmount = payments.filter((p) => p.status === "overdue").reduce((sum, p) => sum + p.amount, 0);

  const stats = {
    totalEarnings,
    pendingAmount,
    overdueAmount,
    paidCount: payments.filter((p) => p.status === "paid").length,
  };

  const handleDownloadInvoice = (invoiceNo: string) => {
    toast.success(`Invoice ${invoiceNo} downloaded`);
  };

  const handleSendReminder = (hospital: string) => {
    toast.success(`Payment reminder sent to ${hospital}`);
  };

  return (
    <DashboardLayout
      role="waste-management"
      title="Payments"
      breadcrumbs={[
        { label: "Dashboard", href: "/waste-management" },
        { label: "Payments" },
      ]}
      userName="Waste Operator"
      userRole="Waste Collection Team"
    >
      <div className="space-y-6">
        {/* Stats */}
        <DashboardGrid cols={4}>
          <StatsCard
            title="Total Earnings"
            value={`₹${stats.totalEarnings.toLocaleString()}`}
            icon={IndianRupee}
            subtitle="This month"
            className="border-green-200 dark:border-green-900"
          />
          <StatsCard
            title="Pending"
            value={`₹${stats.pendingAmount.toLocaleString()}`}
            icon={Clock}
            subtitle="Awaiting payment"
            className="border-yellow-200 dark:border-yellow-900"
          />
          <StatsCard
            title="Overdue"
            value={`₹${stats.overdueAmount.toLocaleString()}`}
            icon={AlertCircle}
            subtitle="Past due date"
            className="border-red-200 dark:border-red-900"
          />
          <StatsCard
            title="Paid Invoices"
            value={stats.paidCount}
            icon={CheckCircle}
            subtitle="This month"
          />
        </DashboardGrid>

        {/* Earnings Chart */}
        <AnimatedCard>
          <h3 className="text-lg font-semibold mb-4">Monthly Earnings</h3>
          <div className="h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyEarnings}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="month" className="text-xs" />
                <YAxis className="text-xs" />
                <Tooltip
                  formatter={(value) => [`₹${Number(value).toLocaleString()}`, "Earnings"]}
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    borderColor: "hsl(var(--border))",
                  }}
                />
                <Bar dataKey="earnings" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </AnimatedCard>

        {/* Filters */}
        <AnimatedCard>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-1 gap-4">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search hospitals or invoices..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                <SelectTrigger className="w-36">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="paid">Paid</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="overdue">Overdue</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button variant="outline">
              <Download className="mr-2 h-4 w-4" />
              Export Report
            </Button>
          </div>
        </AnimatedCard>

        {/* Payments Table */}
        <AnimatedCard delay={0.1}>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Invoice</TableHead>
                <TableHead>Hospital</TableHead>
                <TableHead>Period</TableHead>
                <TableHead>Collections</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredPayments.map((payment, index) => (
                <motion.tr
                  key={payment.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <TableCell className="font-mono text-sm">{payment.invoiceNo}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Building className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">{payment.hospital}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">{payment.period}</TableCell>
                  <TableCell>{payment.collections}</TableCell>
                  <TableCell className="font-medium">₹{payment.amount.toLocaleString()}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {getStatusIcon(payment.status)}
                      <Badge variant={getStatusColor(payment.status)}>{payment.status}</Badge>
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setSelectedPayment(payment)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Payment Details</DialogTitle>
                            <DialogDescription>{payment.invoiceNo}</DialogDescription>
                          </DialogHeader>
                          {selectedPayment && (
                            <div className="space-y-4">
                              <div className="grid grid-cols-2 gap-4">
                                <div>
                                  <p className="text-sm text-muted-foreground">Hospital</p>
                                  <p className="font-medium">{selectedPayment.hospital}</p>
                                </div>
                                <div>
                                  <p className="text-sm text-muted-foreground">Period</p>
                                  <p className="font-medium">{selectedPayment.period}</p>
                                </div>
                              </div>
                              <div className="grid grid-cols-2 gap-4">
                                <div>
                                  <p className="text-sm text-muted-foreground">Collections</p>
                                  <p className="font-medium">{selectedPayment.collections}</p>
                                </div>
                                <div>
                                  <p className="text-sm text-muted-foreground">Amount</p>
                                  <p className="font-medium text-lg">₹{selectedPayment.amount.toLocaleString()}</p>
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                {getStatusIcon(selectedPayment.status)}
                                <Badge variant={getStatusColor(selectedPayment.status)}>
                                  {selectedPayment.status}
                                </Badge>
                                {selectedPayment.paidDate && (
                                  <span className="text-sm text-muted-foreground">
                                    Paid on {selectedPayment.paidDate}
                                  </span>
                                )}
                              </div>
                              <div className="flex gap-2 pt-4">
                                <Button
                                  variant="outline"
                                  className="flex-1"
                                  onClick={() => handleDownloadInvoice(selectedPayment.invoiceNo)}
                                >
                                  <Receipt className="mr-2 h-4 w-4" />
                                  Download Invoice
                                </Button>
                                {selectedPayment.status !== "paid" && (
                                  <Button
                                    className="flex-1"
                                    onClick={() => handleSendReminder(selectedPayment.hospital)}
                                  >
                                    Send Reminder
                                  </Button>
                                )}
                              </div>
                            </div>
                          )}
                        </DialogContent>
                      </Dialog>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDownloadInvoice(payment.invoiceNo)}
                      >
                        <Receipt className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </motion.tr>
              ))}
            </TableBody>
          </Table>
        </AnimatedCard>
      </div>
    </DashboardLayout>
  );
}
