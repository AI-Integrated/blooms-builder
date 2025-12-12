import { useState } from "react";
import { Layout } from "@/components/layout/Layout";
import { QuestionBankForm } from "@/components/questionbank/QuestionBankForm";
import { QuestionBankList } from "@/components/questionbank/QuestionBankList";
import BulkImport from "@/components/BulkImport";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Database, Upload } from "lucide-react";

export default function QuestionBank() {
  const [activeTab, setActiveTab] = useState("view");

  return (
    <Layout>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Question Bank</h1>
            <p className="text-muted-foreground">
              Manage your test questions repository
            </p>
          </div>
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              onClick={() => setActiveTab("bulk")}
              className="gap-2"
            >
              <Upload className="h-4 w-4" />
              Bulk Import
            </Button>
            <Button 
              onClick={() => setActiveTab("add")}
              className="gap-2"
            >
              <Plus className="h-4 w-4" />
              Add Question
            </Button>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="view" className="gap-2">
              <Database className="h-4 w-4" />
              View Questions
            </TabsTrigger>
            <TabsTrigger value="add" className="gap-2">
              <Plus className="h-4 w-4" />
              Add Question
            </TabsTrigger>
            <TabsTrigger value="bulk" className="gap-2">
              <Upload className="h-4 w-4" />
              Bulk Import
            </TabsTrigger>
          </TabsList>

          <TabsContent value="view" className="mt-6">
            <QuestionBankList />
          </TabsContent>

          <TabsContent value="add" className="mt-6">
            <QuestionBankForm onSuccess={() => setActiveTab("view")} />
          </TabsContent>

          <TabsContent value="bulk" className="mt-6">
            <BulkImport 
              onClose={() => setActiveTab("view")}
              onImportComplete={() => {
                setActiveTab("view");
                // Refresh the question list
                window.location.reload();
              }}
            />
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}