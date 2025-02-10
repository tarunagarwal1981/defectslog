import React, { useState, useEffect, useCallback } from 'react';
import { ToastProvider } from './components/ui/toast';
import { useToast } from './components/ui/use-toast';
import { Toaster } from "./components/ui/toaster";
import Auth from './components/Auth';
import Header from './components/Header';
import StatsCards from './components/StatsCards';
import SearchBar from './components/SearchBar';
import DefectsTable from './components/DefectsTable';
import DefectDialog from './components/DefectDialog';
import ChatBot from './components/ChatBot/ChatBot';
import { supabase, getUserPermissions } from './supabaseClient';

// Fetch user's vessels (unchanged)
const getUserVessels = async (userId) => {
  try {
    const { data, error } = await supabase
      .from('user_vessels')
      .select(`
        vessel_id,
        vessels!inner (
          vessel_id,
          vessel_name
        )
      `)
      .eq('user_id', userId);

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error fetching user vessels:', error);
    throw error;
  }
};

function App() {
  const { toast } = useToast();
  
  // User and auth states
  const [session, setSession] = useState(null);
  const [userPermissions, setUserPermissions] = useState(null);
  
  // Data states
  const [data, setData] = useState([]);
  const [assignedVessels, setAssignedVessels] = useState([]);
  const [vesselNames, setVesselNames] = useState({});
  const [loading, setLoading] = useState(true);
  const [isPdfGenerating, setIsPdfGenerating] = useState(false);
  const [dateRange, setDateRange] = useState({ from: '', to: '' });
  
  // Filter states (unchanged)
  const [currentVessel, setCurrentVessel] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState(['OPEN', 'IN PROGRESS']);
  const [criticalityFilter, setCriticalityFilter] = useState([]);
  const [raisedByFilter, setRaisedByFilter] = useState([]);
  
  // Dialog states
  const [isDefectDialogOpen, setIsDefectDialogOpen] = useState(false);
  const [currentDefect, setCurrentDefect] = useState(null);

  // Initialize auth and permissions
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setSession(session);
      if (session?.user) {
        // Fetch user permissions when auth state changes
        try {
          const permissions = await getUserPermissions(session.user.id);
          setUserPermissions(permissions);
        } catch (error) {
          console.error('Error fetching permissions:', error);
          toast({
            title: "Error",
            description: "Failed to load user permissions",
            variant: "destructive",
          });
        }
      } else {
        setUserPermissions(null);
      }
    });

    return () => subscription.unsubscribe();
  }, [toast]);

  // Fetch user data with permissions
  const fetchUserData = useCallback(async () => {
    if (!session?.user?.id || !userPermissions) return;

    try {
      setLoading(true);
      
      const userVessels = await getUserVessels(session.user.id);
      
      const vesselIds = userVessels.map(v => v.vessel_id);
      const vesselsMap = userVessels.reduce((acc, v) => {
        if (v.vessels) {
          acc[v.vessel_id] = v.vessels.vessel_name;
        }
        return acc;
      }, {});

      let query = supabase
        .from('defects register')
        .select('*')
        .eq('is_deleted', false)
        .in('vessel_id', vesselIds)
        .order('Date Reported', { ascending: false });

      // Add external visibility filter if user is external
      if (userPermissions.isExternal) {
        query = query.eq('external_visibility', true);
      }

      const { data: defects, error: defectsError } = await query;

      if (defectsError) throw defectsError;

      setAssignedVessels(vesselIds);
      setVesselNames(vesselsMap);
      setData(defects || []);
      
    } catch (error) {
      console.error("Error fetching data:", error);
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [session?.user?.id, userPermissions, toast]);

  useEffect(() => {
    if (session?.user && userPermissions) {
      fetchUserData();
    } else {
      setData([]);
      setAssignedVessels([]);
      setVesselNames({});
    }
  }, [session?.user, userPermissions, fetchUserData]);

  // Handle defect operations with permission checks
  const handleAddDefect = () => {
    if (!userPermissions?.can.create) {
      toast({
        title: "Permission Denied",
        description: "You don't have permission to create defects",
        variant: "destructive",
      });
      return;
    }

    if (assignedVessels.length === 0) {
      toast({
        title: "Error",
        description: "No vessels assigned to you. Contact administrator.",
        variant: "destructive",
      });
      return;
    }

    setCurrentDefect({
      id: `temp-${Date.now()}`,
      SNo: data.length + 1,
      vessel_id: '',
      Equipments: '',
      Description: '',
      'Action Planned': '',
      Criticality: '',
      'Status (Vessel)': 'OPEN',
      'Date Reported': new Date().toISOString().split('T')[0],
      'Date Completed': '',
      initial_files: [],
      completion_files: [],
      raised_by: ''
    });
    setIsDefectDialogOpen(true);
  };

  const handleSaveDefect = async (updatedDefect) => {
    if (!userPermissions?.can.update && !updatedDefect.id?.startsWith('temp-')) {
      toast({
        title: "Permission Denied",
        description: "You don't have permission to update defects",
        variant: "destructive",
      });
      return;
    }

    if (!userPermissions?.can.create && updatedDefect.id?.startsWith('temp-')) {
      toast({
        title: "Permission Denied",
        description: "You don't have permission to create defects",
        variant: "destructive",
      });
      return;
    }

    try {
      if (!assignedVessels.includes(updatedDefect.vessel_id)) {
        throw new Error("Not authorized for this vessel");
      }

      const isNewDefect = updatedDefect.id?.startsWith('temp-');
      
      const defectData = {
        vessel_id: updatedDefect.vessel_id,
        vessel_name: vesselNames[updatedDefect.vessel_id],
        "Status (Vessel)": updatedDefect['Status (Vessel)'],
        Equipments: updatedDefect.Equipments,
        Description: updatedDefect.Description,
        "Action Planned": updatedDefect['Action Planned'],
        Criticality: updatedDefect.Criticality,
        "Date Reported": updatedDefect['Date Reported'],
        "Date Completed": updatedDefect['Date Completed'] || null,
        Comments: updatedDefect.Comments || '',
        initial_files: updatedDefect.initial_files || [],
        completion_files: updatedDefect.completion_files || [],
        closure_comments: updatedDefect.closure_comments || null,
        raised_by: updatedDefect.raised_by || '',
        external_visibility: updatedDefect.external_visibility || false
      };

      let result;
      if (isNewDefect) {
        const { data: insertedData, error: insertError } = await supabase
          .from('defects register')
          .insert([defectData])
          .select('*')
          .single();

        if (insertError) throw insertError;
        result = insertedData;
        setData(prevData => [result, ...prevData]);
      } else {
        const { data: updatedData, error: updateError } = await supabase
          .from('defects register')
          .update(defectData)
          .eq('id', updatedDefect.id)
          .select('*')
          .single();

        if (updateError) throw updateError;
        result = updatedData;
        setData(prevData => {
          const updatedData = prevData.map(d => d.id === result.id ? result : d);
          return [...updatedData].sort((a, b) => 
            new Date(b['Date Reported']) - new Date(a['Date Reported'])
          );
        });
      }

      toast({
        title: isNewDefect ? "Defect Added" : "Defect Updated",
        description: "Successfully saved the defect",
      });

      setIsDefectDialogOpen(false);
      setCurrentDefect(null);

    } catch (error) {
      console.error("Error saving defect:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to save defect",
        variant: "destructive",
      });
    }
  };

  const handleDeleteDefect = async (defectId) => {
    if (!userPermissions?.can.delete) {
      toast({
        title: "Permission Denied",
        description: "You don't have permission to delete defects",
        variant: "destructive",
      });
      return;
    }

    try {
      // ... rest of delete logic remains the same ...
    } catch (error) {
      console.error("Error deleting defect:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to delete defect",
        variant: "destructive",
      });
    }
  };

  const handleLogout = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      setUserPermissions(null);
    } catch (error) {
      console.error("Error logging out:", error);
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleGeneratePdf = useCallback(async () => {
    if (!userPermissions?.can.read) {
      toast({
        title: "Permission Denied",
        description: "You don't have permission to generate reports",
        variant: "destructive",
      });
      return;
    }

    setIsPdfGenerating(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 1000));
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to generate PDF. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsPdfGenerating(false);
    }
  }, [userPermissions, toast]);

  const getSelectedVesselsDisplay = () => {
    if (currentVessel.length === 0) return 'All Vessels';
    if (currentVessel.length === 1) {
      return vesselNames[currentVessel[0]] || 'All Vessels';
    }
    return `${currentVessel.length} Vessels Selected`;
  };

  // Get unique raised by options
  const raisedByOptions = React.useMemo(() => {
    return [...new Set(data.map(defect => defect.raised_by).filter(Boolean))].sort();
  }, [data]);

  // Filter data based on all criteria
  const filteredData = React.useMemo(() => {
    return data.filter(defect => {
      const defectDate = new Date(defect['Date Reported']);
      
      // Check if defect matches any of the selected filters (or all if none selected)
      const matchesVessel = currentVessel.length === 0 || currentVessel.includes(defect.vessel_id);
      const matchesStatus = statusFilter.length === 0 || statusFilter.includes(defect['Status (Vessel)']);
      const matchesCriticality = criticalityFilter.length === 0 || criticalityFilter.includes(defect.Criticality);
      const matchesRaisedBy = raisedByFilter.length === 0 || raisedByFilter.includes(defect.raised_by);
      
      const matchesSearch = !searchTerm || 
        Object.values(defect).some(value => 
          String(value).toLowerCase().includes(searchTerm.toLowerCase())
        );
        
      const matchesDateRange = 
        (!dateRange.from || defectDate >= new Date(dateRange.from)) &&
        (!dateRange.to || defectDate <= new Date(dateRange.to));
  
      return matchesVessel && matchesStatus && matchesCriticality && 
             matchesRaisedBy && matchesSearch && matchesDateRange;
    });
  }, [data, currentVessel, statusFilter, criticalityFilter, raisedByFilter, 
      searchTerm, dateRange]);

  return (
    <ToastProvider>
      <div className="min-h-screen bg-background">
        {session ? (
          <>
            <Header 
              user={session.user}
              vessels={Object.entries(vesselNames)}
              currentVessel={currentVessel}
              onVesselChange={setCurrentVessel}
              onLogout={handleLogout}
              dateRange={dateRange}
              onDateRangeChange={setDateRange}
            />
            
            <main className="container mx-auto pt-20">
              <StatsCards data={filteredData} />
              
              <SearchBar 
                onSearch={setSearchTerm}
                onFilterStatus={setStatusFilter}
                onFilterCriticality={setCriticalityFilter}
                onFilterRaisedBy={setRaisedByFilter}
                status={statusFilter}
                criticality={criticalityFilter}
                raisedBy={raisedByFilter}
                raisedByOptions={raisedByOptions}
              />
              
              <DefectsTable
                data={filteredData}
                onAddDefect={handleAddDefect}
                onEditDefect={(defect) => {
                  if (!userPermissions?.can.update) {
                    toast({
                      title: "Permission Denied",
                      description: "You don't have permission to edit defects",
                      variant: "destructive",
                    });
                    return;
                  }
                  setCurrentDefect(defect);
                  setIsDefectDialogOpen(true);
                }}
                onDeleteDefect={handleDeleteDefect}
                loading={loading}
                permissions={userPermissions}
              />

              <DefectDialog
                isOpen={isDefectDialogOpen}
                onClose={() => {
                  setIsDefectDialogOpen(false);
                  setCurrentDefect(null);
                }}
                defect={currentDefect}
                onChange={(field, value) => 
                  setCurrentDefect(prev => ({ ...prev, [field]: value }))
                }
                onSave={handleSaveDefect}
                vessels={vesselNames}
                isNew={currentDefect?.id?.startsWith('temp-')}
                permissions={userPermissions}
              />

              <ChatBot 
                data={filteredData}
                vesselName={getSelectedVesselsDisplay()}
                filters={{
                  status: statusFilter,
                  criticality: criticalityFilter,
                  search: searchTerm
                }}
                isPdfGenerating={isPdfGenerating}
                onGeneratePdf={handleGeneratePdf}
              />
            </main>
          </>
        ) : (
          <Auth onLogin={setSession} />
        )}
      </div>
      <Toaster />
    </ToastProvider>
  );
}

export default App;
