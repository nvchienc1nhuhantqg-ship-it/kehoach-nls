
import React, { useState, useEffect, useCallback } from 'react';
import { PlanItem, NlsDatabase, NlsDomain, ModalType } from './types';
import { planData_VinhGoc, planData_CV3456_Mapped, csvDataL123, csvDataL45, planData_CongNghe } from './constants';
import { parseNlsCsvData } from './services/nlsService';
import { exportToExcel } from './services/exportService';
import { getGeminiSuggestion, getGeminiLessonPlan, integrateNlsIntoLessonPlan } from './services/geminiService';
import Header from './components/Header';
import Controls from './components/Controls';
import Instructions from './components/Instructions';
import PlanTable from './components/PlanTable';
import NlsDescriptionModal from './components/modals/NlsDescriptionModal';
import NlsPickerModal from './components/modals/NlsPickerModal';
import GeminiSuggestModal from './components/modals/GeminiSuggestModal';

const App: React.FC = () => {
    const [selectedClass, setSelectedClass] = useState<string>('3');
    const [selectedSubject, setSelectedSubject] = useState<string>('TinHoc');
    const [planData, setPlanData] = useState<PlanItem[]>([]);
    const [isPlanLoaded, setIsPlanLoaded] = useState<boolean>(false);
    const [nlsDatabase, setNlsDatabase] = useState<NlsDatabase>({});
    const [nlsTreeL123, setNlsTreeL123] = useState<NlsDomain[]>([]);
    const [nlsTreeL45, setNlsTreeL45] = useState<NlsDomain[]>([]);

    // Modal States
    const [activeModal, setActiveModal] = useState<ModalType | null>(null);
    
    // Picker State
    const [pickerRowIndex, setPickerRowIndex] = useState<number | null>(null);

    // Gemini State
    const [geminiRowIndex, setGeminiRowIndex] = useState<number | null>(null);
    const [isGeminiLoading, setIsGeminiLoading] = useState<boolean>(false);
    const [geminiSuggestion, setGeminiSuggestion] = useState<string | null>(null);
    const [geminiError, setGeminiError] = useState<string | null>(null);
    
    // Gemini Lesson Plan State
    const [isGeneratingPlan, setIsGeneratingPlan] = useState<boolean>(false);
    const [generatedPlan, setGeneratedPlan] = useState<string | null>(null);
    const [planError, setPlanError] = useState<string | null>(null);

    // Gemini Integration State
    const [isIntegrating, setIsIntegrating] = useState<boolean>(false);
    const [integratedPlan, setIntegratedPlan] = useState<string | null>(null);
    const [integrationError, setIntegrationError] = useState<string | null>(null);


    useEffect(() => {
        const { db, treeL123, treeL45 } = parseNlsCsvData(csvDataL123, csvDataL45);
        setNlsDatabase(db);
        setNlsTreeL123(treeL123);
        setNlsTreeL45(treeL45);
    }, []);

    const handleLoadPlan = useCallback(() => {
        let data: PlanItem[] = [];
        if (selectedSubject === 'TinHoc') {
            // Default to loading the Mapped (CV 3456) version for Tin Hoc
            data = planData_CV3456_Mapped[selectedClass] || [];
        } else {
            // Load Cong Nghe data
            data = planData_CongNghe[selectedClass] || [];
        }
        
        // Deep copy to ensure state updates trigger re-renders
        setPlanData(JSON.parse(JSON.stringify(data)));
        setIsPlanLoaded(true);
    }, [selectedClass, selectedSubject]);

    const handleFillGoc = useCallback(() => {
        if (selectedSubject !== 'TinHoc') return;
        const data = planData_VinhGoc[selectedClass] || [];
        setPlanData(JSON.parse(JSON.stringify(data)));
    }, [selectedClass, selectedSubject]);

    const handleAutoBuild = useCallback(() => {
        let data: PlanItem[] = [];
        if (selectedSubject === 'TinHoc') {
            data = planData_CV3456_Mapped[selectedClass] || [];
        } else {
            data = planData_CongNghe[selectedClass] || [];
        }
        setPlanData(JSON.parse(JSON.stringify(data)));
    }, [selectedClass, selectedSubject]);

    const handleExport = useCallback(() => {
        exportToExcel(planData, nlsDatabase, selectedClass, selectedSubject);
    }, [planData, nlsDatabase, selectedClass, selectedSubject]);

    const openPicker = (index: number) => {
        setPickerRowIndex(index);
        setActiveModal(ModalType.NLS_PICKER);
    };

    const saveNlsForPicker = (selectedCodes: string[]) => {
        if (pickerRowIndex !== null) {
            const newPlan = [...planData];
            newPlan[pickerRowIndex].nls = selectedCodes;
            setPlanData(newPlan);
        }
        closeModal();
    };

    const openGeminiSuggest = async (index: number) => {
        setGeminiRowIndex(index);
        setGeminiSuggestion(null);