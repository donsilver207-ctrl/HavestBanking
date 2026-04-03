"use client"

import { useState } from "react"
import { Search, Shield, User, ArrowRightLeft, Settings, Key } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { adminLogs } from "@/lib/mock-data"

const iconMap: Record<string, React.ElementType> = {
  kyc: Shield,
  account: User,
  tier: ArrowRightLeft,
  transaction: ArrowRightLeft,
  system: Settings,
  auth: Key,
}

export default function AdminLogsPage() {
  const [search, setSearch] = useState("")
  const [typeFilter, setTypeFilter] = useState("all")

  const filtered = adminLogs.filter((log) => {
    const matchesSearch =
      log.action.toLowerCase().includes(search.toLowerCase()) ||
      log.user.toLowerCase().includes(search.toLowerCase())
    const matchesType = typeFilter === "all" || log.type === typeFilter
    return matchesSearch && matchesType
  })

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-serif text-2xl font-bold text-foreground">
          Audit Logs
        </h1>
        <p className="text-sm text-muted-foreground">
          Complete audit trail of all administrative actions
        </p>
      </div>

      <Card className="border-border">
        <CardContent className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search logs..."
              className="pl-10"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="kyc">KYC</SelectItem>
              <SelectItem value="account">Account</SelectItem>
              <SelectItem value="tier">Tier</SelectItem>
              <SelectItem value="transaction">Transaction</SelectItem>
              <SelectItem value="system">System</SelectItem>
              <SelectItem value="auth">Auth</SelectItem>
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      <Card className="border-border">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs text-muted-foreground">
                  <th className="p-4 font-medium">ID</th>
                  <th className="p-4 font-medium">Action</th>
                  <th className="p-4 font-medium">User</th>
                  <th className="p-4 font-medium">Admin</th>
                  <th className="p-4 font-medium">Type</th>
                  <th className="p-4 font-medium">Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filtered.map((log) => {
                  const Icon = iconMap[log.type] || Settings
                  return (
                    <tr
                      key={log.id}
                      className="transition-colors hover:bg-muted/50"
                    >
                      <td className="p-4 font-mono text-xs text-muted-foreground">
                        {log.id}
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          <Icon className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium text-foreground">
                            {log.action}
                          </span>
                        </div>
                      </td>
                      <td className="p-4 text-muted-foreground">{log.user}</td>
                      <td className="p-4 text-muted-foreground">{log.admin}</td>
                      <td className="p-4">
                        <Badge variant="outline" className="text-xs">
                          {log.type}
                        </Badge>
                      </td>
                      <td className="p-4 font-mono text-xs text-muted-foreground">
                        {log.timestamp}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          {filtered.length === 0 && (
            <p className="py-8 text-center text-sm text-muted-foreground">
              No logs match your filters.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
