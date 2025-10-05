"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { 
  Users, 
  Plus, 
  Edit, 
  Trash2,
  Phone,
  Mail,
  MapPin,
  Building,
  UserPlus,
  MoreHorizontal
} from "lucide-react"

export default function OrgChartPage() {
  const [orgData, setOrgData] = useState([
    {
      id: "1",
      name: "John Doe",
      title: "CEO",
      department: "Executive",
      email: "john.doe@company.com",
      phone: "+1 (555) 123-4567",
      location: "San Francisco, CA",
      level: 1,
      parentId: null,
      children: ["2", "3", "4"]
    },
    {
      id: "2", 
      name: "Jane Smith",
      title: "CTO",
      department: "Engineering",
      email: "jane.smith@company.com",
      phone: "+1 (555) 123-4568",
      location: "San Francisco, CA",
      level: 2,
      parentId: "1",
      children: ["5", "6"]
    },
    {
      id: "3",
      name: "Mike Johnson", 
      title: "CMO",
      department: "Marketing",
      email: "mike.johnson@company.com",
      phone: "+1 (555) 123-4569",
      location: "New York, NY",
      level: 2,
      parentId: "1",
      children: ["7", "8"]
    },
    {
      id: "4",
      name: "Sarah Wilson",
      title: "CFO", 
      department: "Finance",
      email: "sarah.wilson@company.com",
      phone: "+1 (555) 123-4570",
      location: "San Francisco, CA",
      level: 2,
      parentId: "1",
      children: ["9"]
    },
    {
      id: "5",
      name: "Alex Chen",
      title: "VP Engineering",
      department: "Engineering", 
      email: "alex.chen@company.com",
      phone: "+1 (555) 123-4571",
      location: "San Francisco, CA",
      level: 3,
      parentId: "2",
      children: []
    },
    {
      id: "6",
      name: "Lisa Park",
      title: "VP Product",
      department: "Product",
      email: "lisa.park@company.com", 
      phone: "+1 (555) 123-4572",
      location: "San Francisco, CA",
      level: 3,
      parentId: "2",
      children: []
    },
    {
      id: "7",
      name: "David Brown",
      title: "VP Marketing",
      department: "Marketing",
      email: "david.brown@company.com",
      phone: "+1 (555) 123-4573", 
      location: "New York, NY",
      level: 3,
      parentId: "3",
      children: []
    },
    {
      id: "8",
      name: "Emma Davis",
      title: "VP Sales",
      department: "Sales",
      email: "emma.davis@company.com",
      phone: "+1 (555) 123-4574",
      location: "New York, NY", 
      level: 3,
      parentId: "3",
      children: []
    },
    {
      id: "9",
      name: "Tom Wilson",
      title: "VP Finance",
      department: "Finance",
      email: "tom.wilson@company.com",
      phone: "+1 (555) 123-4575",
      location: "San Francisco, CA",
      level: 3,
      parentId: "4", 
      children: []
    }
  ])

  const getLevelColor = (level: number) => {
    switch (level) {
      case 1: return "bg-yellow-500"
      case 2: return "bg-blue-500" 
      case 3: return "bg-green-500"
      default: return "bg-gray-500"
    }
  }

  const getDepartmentColor = (department: string) => {
    switch (department) {
      case "Executive": return "bg-yellow-100 text-yellow-800"
      case "Engineering": return "bg-blue-100 text-blue-800"
      case "Marketing": return "bg-purple-100 text-purple-800"
      case "Finance": return "bg-green-100 text-green-800"
      case "Product": return "bg-orange-100 text-orange-800"
      case "Sales": return "bg-red-100 text-red-800"
      default: return "bg-gray-100 text-gray-800"
    }
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center space-x-2">
            <Users className="h-8 w-8 text-primary" />
            <span>Organization Chart</span>
          </h1>
          <p className="text-muted-foreground">
            Visualize your team structure and reporting relationships
          </p>
        </div>
        <div className="flex space-x-2">
          <Button variant="outline">
            <Edit className="mr-2 h-4 w-4" />
            Edit Structure
          </Button>
          <Button>
            <UserPlus className="mr-2 h-4 w-4" />
            Add Member
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Members</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{orgData.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Departments</CardTitle>
            <Building className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {new Set(orgData.map(person => person.department)).size}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Locations</CardTitle>
            <MapPin className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {new Set(orgData.map(person => person.location)).size}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Open Positions</CardTitle>
            <UserPlus className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">3</div>
          </CardContent>
        </Card>
      </div>

      {/* Organization Chart */}
      <div className="space-y-6">
        <h2 className="text-xl font-semibold">Team Structure</h2>
        
        {/* Level 1 - CEO */}
        <div className="flex justify-center">
          {orgData.filter(person => person.level === 1).map((person) => (
            <Card key={person.id} className="w-80 hover:shadow-md transition-shadow">
              <CardHeader className="text-center">
                <div className="flex justify-center mb-2">
                  <div className={`h-16 w-16 rounded-full ${getLevelColor(person.level)} flex items-center justify-center text-white font-bold text-xl`}>
                    {person.name.split(' ').map(n => n[0]).join('')}
                  </div>
                </div>
                <CardTitle className="text-lg">{person.name}</CardTitle>
                <CardDescription className="text-sm">{person.title}</CardDescription>
                <Badge className={`${getDepartmentColor(person.department)} text-xs`}>
                  {person.department}
                </Badge>
              </CardHeader>
              <CardContent className="text-center space-y-2">
                <div className="flex items-center justify-center space-x-1 text-sm text-muted-foreground">
                  <Mail className="h-3 w-3" />
                  <span>{person.email}</span>
                </div>
                <div className="flex items-center justify-center space-x-1 text-sm text-muted-foreground">
                  <Phone className="h-3 w-3" />
                  <span>{person.phone}</span>
                </div>
                <div className="flex items-center justify-center space-x-1 text-sm text-muted-foreground">
                  <MapPin className="h-3 w-3" />
                  <span>{person.location}</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Level 2 - VPs */}
        <div className="flex justify-center space-x-8">
          {orgData.filter(person => person.level === 2).map((person) => (
            <Card key={person.id} className="w-72 hover:shadow-md transition-shadow">
              <CardHeader className="text-center">
                <div className="flex justify-center mb-2">
                  <div className={`h-12 w-12 rounded-full ${getLevelColor(person.level)} flex items-center justify-center text-white font-bold`}>
                    {person.name.split(' ').map(n => n[0]).join('')}
                  </div>
                </div>
                <CardTitle className="text-base">{person.name}</CardTitle>
                <CardDescription className="text-sm">{person.title}</CardDescription>
                <Badge className={`${getDepartmentColor(person.department)} text-xs`}>
                  {person.department}
                </Badge>
              </CardHeader>
              <CardContent className="text-center space-y-1">
                <div className="flex items-center justify-center space-x-1 text-xs text-muted-foreground">
                  <Mail className="h-3 w-3" />
                  <span className="truncate">{person.email}</span>
                </div>
                <div className="flex items-center justify-center space-x-1 text-xs text-muted-foreground">
                  <MapPin className="h-3 w-3" />
                  <span>{person.location}</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Level 3 - Directors */}
        <div className="flex justify-center space-x-4">
          {orgData.filter(person => person.level === 3).map((person) => (
            <Card key={person.id} className="w-64 hover:shadow-md transition-shadow">
              <CardHeader className="text-center">
                <div className="flex justify-center mb-2">
                  <div className={`h-10 w-10 rounded-full ${getLevelColor(person.level)} flex items-center justify-center text-white font-bold text-sm`}>
                    {person.name.split(' ').map(n => n[0]).join('')}
                  </div>
                </div>
                <CardTitle className="text-sm">{person.name}</CardTitle>
                <CardDescription className="text-xs">{person.title}</CardDescription>
                <Badge className={`${getDepartmentColor(person.department)} text-xs`}>
                  {person.department}
                </Badge>
              </CardHeader>
              <CardContent className="text-center">
                <div className="flex items-center justify-center space-x-1 text-xs text-muted-foreground">
                  <Mail className="h-3 w-3" />
                  <span className="truncate">{person.email}</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Department Overview */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold">Department Overview</h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {Array.from(new Set(orgData.map(person => person.department))).map((dept) => {
            const deptMembers = orgData.filter(person => person.department === dept)
            return (
              <Card key={dept}>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Building className="h-5 w-5" />
                    <span>{dept}</span>
                    <Badge variant="secondary">{deptMembers.length}</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {deptMembers.map((member) => (
                      <div key={member.id} className="flex items-center justify-between text-sm">
                        <span>{member.name}</span>
                        <span className="text-muted-foreground">{member.title}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      </div>
    </div>
  )
}

