"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Loader2,
  Database,
  ChevronRight,
  Eye,
  Table as TableIcon,
} from "lucide-react"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"

type TableSummary = {
  name: string
  rowCount: number
}

type ColumnDetail = {
  column_name: string
  data_type: string
  is_nullable: boolean
}

export default function DatabaseViewerPage() {
  const [tables, setTables] = useState<TableSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedTable, setSelectedTable] = useState<TableSummary | null>(null)
  const [tableData, setTableData] = useState<any[]>([])
  const [tableColumns, setTableColumns] = useState<ColumnDetail[]>([])
  const [dataLoading, setDataLoading] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const [totalRows, setTotalRows] = useState(0)
  const pageSize = 20

  useEffect(() => {
    async function fetchTables() {
      try {
        const res = await fetch("/api/admin/tables")
        if (!res.ok) throw new Error(await res.text())
        const data = await res.json()
        setTables(data.tables)
      } catch (err: any) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }
    fetchTables()
  }, [])

  async function openTable(table: TableSummary, page = 1) {
    setSelectedTable(table)
    setDataLoading(true)
    setCurrentPage(page)
    try {
      const res = await fetch(
        `/api/admin/tables?table=${table.name}&page=${page}&pageSize=${pageSize}`
      )
      if (!res.ok) throw new Error("Failed to fetch table data")
      const data = await res.json()
      setTableColumns(data.columns)
      setTableData(data.rows)
      setTotalRows(data.totalCount)
    } catch (err: any) {
      console.error(err)
      alert(err.message)
    } finally {
      setDataLoading(false)
    }
  }

  const totalPages = Math.ceil(totalRows / pageSize)

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-serif text-2xl font-bold text-foreground">
          Database Explorer
        </h1>
        <p className="text-sm text-muted-foreground">
          Browse and inspect all tables in your public schema
        </p>
      </div>

      {loading && (
        <div className="flex justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      )}
      {error && (
        <div className="rounded-lg border border-destructive/50 bg-destructive/5 p-4 text-destructive">
          Error: {error}
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {tables.map((table) => (
          <Card key={table.name}>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2 font-mono text-base">
                  <Database className="h-4 w-4 text-muted-foreground" />
                  {table.name}
                </CardTitle>
                <Badge variant="secondary">{table.rowCount} rows</Badge>
              </div>
            </CardHeader>
            <CardContent>
              <Button
                variant="outline"
                size="sm"
                className="w-full gap-1"
                onClick={() => openTable(table, 1)}
              >
                <Eye className="h-4 w-4" />
                View all data
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Full Table Data Modal */}
      <Dialog
        open={!!selectedTable}
        onOpenChange={(open) => !open && setSelectedTable(null)}
      >
        <DialogContent className="max-w-[90vw] max-h-[80vh] overflow-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 font-mono">
              <TableIcon className="h-5 w-5" />
              {selectedTable?.name}
              <Badge variant="outline" className="ml-2">
                {totalRows} rows total
              </Badge>
            </DialogTitle>
          </DialogHeader>

          {dataLoading ? (
            <div className="flex justify-center py-16">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : (
            <>
              <div className="overflow-x-auto rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      {tableColumns.map((col) => (
                        <TableHead key={col.column_name} className="whitespace-nowrap">
                          <div className="font-mono text-xs">
                            {col.column_name}
                            <span className="ml-1 text-muted-foreground font-normal">
                              ({col.data_type})
                            </span>
                          </div>
                        </TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {tableData.length === 0 ? (
                      <TableRow>
                        <TableCell
                          colSpan={tableColumns.length}
                          className="text-center text-muted-foreground"
                        >
                          No data in this table
                        </TableCell>
                      </TableRow>
                    ) : (
                      tableData.map((row, idx) => (
                        <TableRow key={idx}>
                          {tableColumns.map((col) => (
                            <TableCell key={col.column_name} className="font-mono text-xs">
                              {formatCellValue(row[col.column_name])}
                            </TableCell>
                          ))}
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between gap-2 pt-4">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={currentPage === 1}
                    onClick={() => openTable(selectedTable!, currentPage - 1)}
                  >
                    Previous
                  </Button>
                  <span className="text-sm text-muted-foreground">
                    Page {currentPage} of {totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={currentPage === totalPages}
                    onClick={() => openTable(selectedTable!, currentPage + 1)}
                  >
                    Next
                  </Button>
                </div>
              )}
            </>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedTable(null)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// Helper to format values (dates, JSON, null)
function formatCellValue(value: any): string {
  if (value === null) return "∅"
  if (typeof value === "object") {
    try {
      return JSON.stringify(value, null, 0).slice(0, 100)
    } catch {
      return "[complex object]"
    }
  }
  if (typeof value === "boolean") return value ? "true" : "false"
  if (value instanceof Date || typeof value === "string" && value.match(/^\d{4}-\d{2}-\d{2}/)) {
    return new Date(value).toLocaleString()
  }
  return String(value).slice(0, 100)
}