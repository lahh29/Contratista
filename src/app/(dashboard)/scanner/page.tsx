"use client"

import * as React from "react"
import { 
  QrCode, 
  Scan, 
  UserCheck, 
  UserMinus, 
  ShieldAlert,
  History,
  Info
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/hooks/use-toast"

export default function ScannerPage() {
  const { toast } = useToast()
  const [lastScanned, setLastScanned] = React.useState<any>(null)
  const [isScanning, setIsScanning] = React.useState(false)

  const simulateScan = (type: 'entry' | 'exit') => {
    setIsScanning(true)
    
    // Simulate API delay
    setTimeout(() => {
      const mockResult = {
        name: "Carlos Mendoza",
        company: "BuildCorp Solutions",
        timestamp: new Date().toLocaleTimeString(),
        type: type,
        status: "AUTHORIZED",
        area: "Main Warehouse"
      }
      
      setLastScanned(mockResult)
      setIsScanning(false)
      
      toast({
        title: `${type.toUpperCase()} Logged`,
        description: `${mockResult.name} recorded at ${mockResult.timestamp}`,
      })
    }, 800)
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in duration-500">
      <div className="text-center space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">Access Control Scanner</h2>
        <p className="text-muted-foreground">Scan contractor QR codes to record entry/exit events.</p>
      </div>

      <div className="grid md:grid-cols-2 gap-8">
        <Card className="border-none shadow-lg overflow-hidden bg-primary text-white">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Scan className="w-5 h-5" /> Live Scanner
            </CardTitle>
            <CardDescription className="text-white/70">
              Mobile responsive scanning interface
            </CardDescription>
          </CardHeader>
          <CardContent className="p-8 flex flex-col items-center justify-center space-y-8">
            <div className="w-64 h-64 bg-white rounded-2xl flex items-center justify-center relative overflow-hidden group">
              {isScanning ? (
                <div className="absolute inset-0 bg-primary/20 flex items-center justify-center backdrop-blur-sm">
                   <div className="w-16 h-16 border-4 border-white border-t-transparent rounded-full animate-spin" />
                </div>
              ) : (
                <QrCode className="w-48 h-48 text-primary opacity-20 group-hover:scale-105 transition-transform" />
              )}
              {/* Scanline animation */}
              <div className="absolute top-0 left-0 right-0 h-1 bg-accent shadow-[0_0_15px_rgba(110,38,217,0.8)] animate-bounce" />
            </div>

            <div className="grid grid-cols-2 gap-4 w-full">
              <Button 
                onClick={() => simulateScan('entry')}
                className="bg-white text-primary hover:bg-white/90 py-6 text-lg font-bold gap-2"
                disabled={isScanning}
              >
                <UserCheck className="w-5 h-5" /> Entry
              </Button>
              <Button 
                onClick={() => simulateScan('exit')}
                variant="outline"
                className="border-white/20 text-white hover:bg-white/10 py-6 text-lg font-bold gap-2"
                disabled={isScanning}
              >
                <UserMinus className="w-5 h-5" /> Exit
              </Button>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card className="border-none shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center gap-2">
                <History className="w-4 h-4" /> Last Event
              </CardTitle>
            </CardHeader>
            <CardContent>
              {lastScanned ? (
                <div className="space-y-4 animate-in slide-in-from-right-4 duration-300">
                  <div className="flex items-start justify-between">
                    <div className="flex gap-3">
                      <div className="w-10 h-10 rounded-full bg-accent/10 flex items-center justify-center text-accent font-bold">
                        {lastScanned.name[0]}
                      </div>
                      <div>
                        <p className="font-bold text-lg">{lastScanned.name}</p>
                        <p className="text-sm text-muted-foreground">{lastScanned.company}</p>
                      </div>
                    </div>
                    <Badge className="bg-green-500 hover:bg-green-600">
                      {lastScanned.status}
                    </Badge>
                  </div>
                  <div className="grid grid-cols-2 gap-4 bg-muted/50 p-4 rounded-xl text-sm">
                    <div>
                      <p className="text-muted-foreground text-xs uppercase font-bold">Type</p>
                      <p className="font-medium uppercase">{lastScanned.type}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground text-xs uppercase font-bold">Time</p>
                      <p className="font-medium">{lastScanned.timestamp}</p>
                    </div>
                    <div className="col-span-2">
                      <p className="text-muted-foreground text-xs uppercase font-bold">Area Assigned</p>
                      <p className="font-medium">{lastScanned.area}</p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="py-8 text-center text-muted-foreground space-y-2">
                  <Info className="w-8 h-8 mx-auto opacity-20" />
                  <p>Ready for scanning</p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="border-none shadow-sm bg-accent/5 border border-accent/10">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold flex items-center gap-2 text-accent">
                <ShieldAlert className="w-4 h-4" /> Scanner Instructions
              </CardTitle>
            </CardHeader>
            <CardContent className="text-xs text-muted-foreground space-y-2">
              <p>• Ensure QR code is fully visible within the camera frame.</p>
              <p>• Verification of SUA status occurs in real-time before authorizing entry.</p>
              <p>• If scanning fails, please verify the contractor's documentation status in the management panel.</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}