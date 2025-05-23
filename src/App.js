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
import { supabase } from './supabaseClient';
import { CORE_FIELDS } from './config/fieldMappings';
import { getUserPermissions, isExternalUser } from './supabaseClient';


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
  const [userPermissions, setUserPermissions] = useState(null);
  const [isExternal, setIsExternal] = useState(false);
  const [session, setSession] = useState(null);
  const [data, setData] = useState([]);
  const [assignedVessels, setAssignedVessels] = useState([]);
  const [vesselNames, setVesselNames] = useState({});
  const [loading, setLoading] = useState(true);
  const [isPdfGenerating, setIsPdfGenerating] = useState(false);
  const [dateRange, setDateRange] = useState({ from: '', to: '' });
  
  const [currentVessel, setCurrentVessel] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState(['OPEN', 'IN PROGRESS']);
  const [criticalityFilter, setCriticalityFilter] = useState([]); 
  const [raisedByFilter, setRaisedByFilter] = useState([]);
    
  const [isDefectDialogOpen, setIsDefectDialogOpen] = useState(false);
  const [currentDefect, setCurrentDefect] = useState(null);

  // Get unique raised by options
  const raisedByOptions = React.useMemo(() => {
    return [...new Set(data.map(defect => defect.raised_by).filter(Boolean))].sort();
  }, [data]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchUserData = useCallback(async () => {
    if (!session?.user?.id) return;
  
    try {
      setLoading(true);
      
      // Fetch permissions first
      const permissions = await getUserPermissions(session.user.id);
      setUserPermissions(permissions);
      
      // Check if external user
      const external = await isExternalUser(session.user.id);
      setIsExternal(external);
      
      // Get user's vessels with names
      const userVessels = await getUserVessels(session.user.id);
      
      const vesselIds = userVessels.map(v => v.vessel_id);
      const vesselsMap = userVessels.reduce((acc, v) => {
        if (v.vessels) {
          acc[v.vessel_id] = v.vessels.vessel_name;
        }
        return acc;
      }, {});
  
      // Implement pagination to fetch all defects
      const PAGE_SIZE = 1000; // Supabase max limit
      let allDefects = [];
      let hasMore = true;
      let page = 0;
      
      while (hasMore) {
        // Base query with pagination
        let query = supabase
          .from('defects register')
          .select('*')
          .in('vessel_id', vesselIds)
          .eq('is_deleted', false)
          .order('Date Reported', { ascending: false })
          .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);
  
        // Add external visibility filter for external users
        if (external) {
          query = query.eq('external_visibility', true);
        }
  
        const { data: defects, error: defectsError } = await query;
  
        if (defectsError) throw defectsError;
        
        if (defects && defects.length > 0) {
          allDefects = [...allDefects, ...defects];
          
          // Check if we need to fetch more pages
          hasMore = defects.length === PAGE_SIZE;
          page++;
          
          // Optional: Update UI to show progress
          if (hasMore) {
            console.log(`Fetched ${allDefects.length} defects so far...`);
            // You could also update a progress state here
          }
        } else {
          hasMore = false;
        }
      }
  
      setAssignedVessels(vesselIds);
      setVesselNames(vesselsMap);
      setData(allDefects || []);
      
      console.log(`Total defects fetched: ${allDefects.length}`);
      
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
  }, [session?.user?.id, toast]);

  useEffect(() => {
    if (session?.user) {
      fetchUserData();
    } else {
      setData([]);
      setAssignedVessels([]);
      setVesselNames({});
    }
  }, [session?.user, fetchUserData]);

  const filteredData = React.useMemo(() => {
    return data.filter(defect => {
      
      // Determine if a defect is overdue
      const isOverdue = () => {
        if (defect['Status (Vessel)'] === 'CLOSED') return false;
        if (!defect.target_date) return false;
        
        const targetDate = new Date(defect.target_date);
        const today = new Date();
        return targetDate < today;
      };
      
      // Check vessel filter
      const matchesVessel = currentVessel.length === 0 || currentVessel.includes(defect.vessel_id);
      
      // Check status filter - this is the updated part
      const matchesStatus = () => {
        // If no status filters are selected, show all statuses
        if (statusFilter.length === 0) return true;
        
        // Get the actual status and overdue state
        const actualStatus = defect['Status (Vessel)'];
        const defectIsOverdue = isOverdue();
        
        // If the defect is overdue and OVERDUE filter is selected, include it
        if (defectIsOverdue && statusFilter.includes('OVERDUE')) {
          return true;
        }
        
        // Otherwise, check if the actual status is in the filter list
        return statusFilter.includes(actualStatus);
      };
      
      // Rest of your filters
      const matchesCriticality = criticalityFilter.length === 0 || criticalityFilter.includes(defect.Criticality);
      const matchesRaisedBy = raisedByFilter.length === 0 || raisedByFilter.includes(defect.raised_by);
      
      const matchesSearch = !searchTerm || 
        Object.values(defect).some(value => 
          String(value).toLowerCase().includes(searchTerm.toLowerCase())
        );
        
      const matchesDateRange = (() => {
        if (!dateRange.from && !dateRange.to) return true;
        
        const defectDate = new Date(defect['Date Reported']);
        const fromDate = dateRange.from ? new Date(dateRange.from) : null;
        const toDate = dateRange.to ? new Date(dateRange.to) : null;
        
        if (fromDate && toDate) {
          return defectDate >= fromDate && defectDate <= toDate;
        } else if (fromDate) {
          return defectDate >= fromDate;
        } else if (toDate) {
          return defectDate <= toDate;
        }
        return true;
      })();
  
      // Call the matchesStatus function instead of just referencing it
      return matchesVessel && matchesStatus() && matchesCriticality && 
             matchesRaisedBy && matchesSearch && matchesDateRange;
    });
  }, [data, currentVessel, statusFilter, criticalityFilter, raisedByFilter, 
      searchTerm, dateRange]);
  const handleGeneratePdf = useCallback(async () => {
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
  }, [toast]);

  const handleAddDefect = () => {
    console.log('Opening dialog');
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
      target_date:'',
      initial_files: [],
      completion_files: [],
      raised_by: ''
    });
    setIsDefectDialogOpen(true);
  };

  const handleSaveDefect = async (updatedDefect) => {
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
        target_date: updatedDefect.target_date || null
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
  
      // IMPORTANT: Return the saved defect object with ID
      return result;
  
    } catch (error) {
      console.error("Error saving defect:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to save defect",
        variant: "destructive",
      });
      throw error; // Re-throw to be caught by the calling function
    }
  };

  const handleDeleteDefect = async (defectId) => {
    console.log('handleDeleteDefect starting with defectId:', defectId);
    try {
      if (!session?.user?.id) {
        console.log('No user session found');
        throw new Error("User not authenticated");
      }

      const defect = data.find(d => d.id === defectId);
      console.log('Found defect to delete:', defect);
      const hasFiles = (defect?.initial_files?.length || 0) + (defect?.completion_files?.length || 0) > 0;
      console.log('Defect has files:', hasFiles);
      const confirmed = window.confirm(
        hasFiles 
          ? "Are you sure you want to delete this defect? This will also delete all associated files."
          : "Are you sure you want to delete this defect?"
      );
      console.log('User confirmed deletion:', confirmed);
      if (!confirmed) return;

      setLoading(true);
      console.log('Set loading to true');
      if (hasFiles) {
        console.log('Attempting to delete files');
        const allFiles = [
          ...(defect.initial_files || []),
          ...(defect.completion_files || [])
        ];

        const { error: storageError } = await supabase.storage
          .from('defect-files')
          .remove(allFiles.map(file => file.path));
        console.log('File deletion response:', { storageError });
        if (storageError) throw storageError;
      }
      
      const { error } = await supabase
        .from('defects register')
        .update({
          is_deleted: true,
          deleted_by: session.user.id,
          deleted_at: new Date().toISOString()
        })
        .eq('id', defectId);

      if (error) throw error;

      setData(prevData => prevData.filter(d => d.id !== defectId));

      toast({
        title: "Defect Deleted",
        description: "Successfully deleted the defect record",
      });

    } catch (error) {
      console.error("Error deleting defect:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to delete defect",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
    } catch (error) {
      console.error("Error logging out:", error);
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const getSelectedVesselsDisplay = () => {
    if (currentVessel.length === 0) return 'All Vessels';
    if (currentVessel.length === 1) {
      return vesselNames[currentVessel[0]] || 'All Vessels';
    }
    return `${currentVessel.length} Vessels Selected`;
  };

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
                  setCurrentDefect(defect);
                  setIsDefectDialogOpen(true);
                }}
                onDeleteDefect={handleDeleteDefect}
                loading={loading}
                permissions={userPermissions}
                isExternal={isExternal}
                vesselNames={vesselNames}
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
                isExternal={isExternal}
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
