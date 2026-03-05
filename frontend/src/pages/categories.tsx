import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Edit2, Trash2, Loader2, Tag } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { categoriesApi, subcategoriesApi } from "@/services/api";
import { useToast } from "@/hooks/use-toast";
import type { Category, Subcategory } from "@/types";

const COLORS = [
  "#2563eb", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6",
  "#06b6d4", "#f97316", "#84cc16", "#ec4899", "#6366f1",
];

export function CategoriesPage() {
  const [categoryDialogOpen, setCategoryDialogOpen] = useState(false);
  const [subcategoryDialogOpen, setSubcategoryDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [editingSubcategory, setEditingSubcategory] = useState<{ subcategory: Subcategory; categoryId: number } | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: categories, isLoading } = useQuery({
    queryKey: ["categories"],
    queryFn: () => categoriesApi.list(),
  });

  const incomeCategories = Array.isArray(categories) ? categories.filter((c) => c.type === "income") : [];
  const expenseCategories = Array.isArray(categories) ? categories.filter((c) => c.type === "expense") : [];

  const createCategoryMutation = useMutation({
    mutationFn: categoriesApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["categories"] });
      setCategoryDialogOpen(false);
      toast({
        title: "Success",
        description: "Category created successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.response?.data?.message || "Failed to create category",
        variant: "destructive",
      });
    },
  });

  const updateCategoryMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<Category> }) =>
      categoriesApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["categories"] });
      setCategoryDialogOpen(false);
      setEditingCategory(null);
      toast({
        title: "Success",
        description: "Category updated successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.response?.data?.message || "Failed to update category",
        variant: "destructive",
      });
    },
  });

  const deleteCategoryMutation = useMutation({
    mutationFn: categoriesApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["categories"] });
      toast({
        title: "Success",
        description: "Category deleted successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.response?.data?.message || "Cannot delete category. It may be in use.",
        variant: "destructive",
      });
    },
  });

  const createSubcategoryMutation = useMutation({
    mutationFn: subcategoriesApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["categories"] });
      setSubcategoryDialogOpen(false);
      toast({
        title: "Success",
        description: "Subcategory created successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.response?.data?.message || "Failed to create subcategory",
        variant: "destructive",
      });
    },
  });

  const updateSubcategoryMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<Subcategory> }) =>
      subcategoriesApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["categories"] });
      setSubcategoryDialogOpen(false);
      setEditingSubcategory(null);
      toast({
        title: "Success",
        description: "Subcategory updated successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.response?.data?.message || "Failed to update subcategory",
        variant: "destructive",
      });
    },
  });

  const deleteSubcategoryMutation = useMutation({
    mutationFn: subcategoriesApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["categories"] });
      toast({
        title: "Success",
        description: "Subcategory deleted successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.response?.data?.message || "Cannot delete subcategory. It may be in use.",
        variant: "destructive",
      });
    },
  });

  const handleOpenCreateCategory = () => {
    setEditingCategory(null);
    setCategoryDialogOpen(true);
  };

  const handleOpenEditCategory = (category: Category) => {
    setEditingCategory(category);
    setCategoryDialogOpen(true);
  };

  const handleOpenCreateSubcategory = (categoryId: number) => {
    setEditingSubcategory(null);
    setSubcategoryDialogOpen(true);
    // Store categoryId in state
    setEditingSubcategory({ subcategory: {} as Subcategory, categoryId });
  };

  const handleOpenEditSubcategory = (subcategory: Subcategory, categoryId: number) => {
    setEditingSubcategory({ subcategory, categoryId });
    setSubcategoryDialogOpen(true);
  };

  const handleDeleteCategory = (id: number) => {
    if (confirm("Are you sure you want to delete this category? All subcategories will also be deleted.")) {
      deleteCategoryMutation.mutate(id);
    }
  };

  const handleDeleteSubcategory = (id: number) => {
    if (confirm("Are you sure you want to delete this subcategory?")) {
      deleteSubcategoryMutation.mutate(id);
    }
  };

  const renderCategorySection = (title: string, type: "income" | "expense", cats: Category[]) => (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-white">{title}</h2>
        <Badge variant={type === "income" ? "default" : "secondary"}>
          {cats.length} {cats.length === 1 ? "category" : "categories"}
        </Badge>
      </div>
      {cats.length > 0 ? (
        <Accordion type="multiple" className="space-y-2">
          {cats.map((category) => (
            <AccordionItem
              key={category.id}
              value={`category-${category.id}`}
              className="rounded-lg border border-white/10 bg-white/5 px-4"
            >
              <AccordionTrigger className="hover:no-underline">
                <div className="flex items-center gap-3 flex-1">
                  <span className="h-3 w-3 rounded-full" style={{ backgroundColor: category.color || COLORS[0] }} />
                  <span className="font-medium text-white">{category.name}</span>
                  <Badge variant="outline" className="ml-auto">
                    {category.subcategories?.length || 0} subcategories
                  </Badge>
                </div>
              </AccordionTrigger>
              <AccordionContent>
                <div className="pt-2 pb-4 space-y-3">
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleOpenEditCategory(category)}
                      className="h-8 text-slate-300 hover:text-white"
                    >
                      <Edit2 className="h-4 w-4 mr-1" />
                      Edit Category
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteCategory(category.id)}
                      className="h-8 text-slate-300 hover:text-red-400"
                      disabled={deleteCategoryMutation.isPending}
                    >
                      {deleteCategoryMutation.isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <>
                          <Trash2 className="h-4 w-4 mr-1" />
                          Delete
                        </>
                      )}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleOpenCreateSubcategory(category.id)}
                      className="h-8 text-emerald-400 hover:text-emerald-300"
                    >
                      <Plus className="h-4 w-4 mr-1" />
                      Add Subcategory
                    </Button>
                  </div>
                  <Separator className="bg-white/10" />
                  {category.subcategories && category.subcategories.length > 0 ? (
                    <div className="space-y-2">
                      {category.subcategories.map((sub) => (
                        <div
                          key={sub.id}
                          className="flex items-center justify-between rounded-lg border border-white/5 bg-white/5 px-3 py-2"
                        >
                          <div className="flex items-center gap-2">
                            <Tag className="h-4 w-4 text-slate-400" />
                            <span className="text-sm text-slate-200">{sub.name}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleOpenEditSubcategory(sub, category.id)}
                              className="h-7 w-7 p-0 text-slate-400 hover:text-white"
                            >
                              <Edit2 className="h-3 w-3" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteSubcategory(sub.id)}
                              className="h-7 w-7 p-0 text-slate-400 hover:text-red-400"
                              disabled={deleteSubcategoryMutation.isPending}
                            >
                              {deleteSubcategoryMutation.isPending ? (
                                <Loader2 className="h-3 w-3 animate-spin" />
                              ) : (
                                <Trash2 className="h-3 w-3" />
                              )}
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-slate-400 text-center py-4">No subcategories yet</p>
                  )}
                </div>
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      ) : (
        <Card className="bg-white/5 text-white">
          <CardContent className="pt-6">
            <p className="text-center text-muted-foreground">No {type} categories found</p>
          </CardContent>
        </Card>
      )}
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Taxonomy</p>
          <h1 className="text-2xl font-semibold text-white">Categories & Subcategories</h1>
        </div>
        <Button
          onClick={handleOpenCreateCategory}
          className="bg-primary text-primary-foreground shadow-lg shadow-primary/40"
        >
          <Plus className="mr-2 h-4 w-4" />
          Add category
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          <Skeleton className="h-32 w-full bg-white/10" />
          <Skeleton className="h-32 w-full bg-white/10" />
        </div>
      ) : (
        <>
          {renderCategorySection("Income Categories", "income", incomeCategories)}
          <Separator className="bg-white/10" />
          {renderCategorySection("Expense Categories", "expense", expenseCategories)}
        </>
      )}

      <CategoryDialog
        open={categoryDialogOpen}
        onOpenChange={setCategoryDialogOpen}
        category={editingCategory}
        onSubmit={(data) => {
          if (editingCategory) {
            updateCategoryMutation.mutate({ id: editingCategory.id, data });
          } else {
            createCategoryMutation.mutate(data);
          }
        }}
        isSubmitting={createCategoryMutation.isPending || updateCategoryMutation.isPending}
      />

      <SubcategoryDialog
        open={subcategoryDialogOpen}
        onOpenChange={setSubcategoryDialogOpen}
        subcategory={editingSubcategory}
        categories={Array.isArray(categories) ? categories : []}
        onSubmit={(data) => {
          if (editingSubcategory?.subcategory.id) {
            updateSubcategoryMutation.mutate({ id: editingSubcategory.subcategory.id, data });
          } else {
            const categoryId = editingSubcategory?.categoryId || data.category_id;
            createSubcategoryMutation.mutate({ ...data, category_id: categoryId });
          }
        }}
        isSubmitting={createSubcategoryMutation.isPending || updateSubcategoryMutation.isPending}
      />
    </div>
  );
}

interface CategoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  category: Category | null;
  onSubmit: (data: { name: string; type: "income" | "expense"; color?: string }) => void;
  isSubmitting: boolean;
}

function CategoryDialog({ open, onOpenChange, category, onSubmit, isSubmitting }: CategoryDialogProps) {
  const [name, setName] = useState("");
  const [type, setType] = useState<"income" | "expense">("expense");
  const [color, setColor] = useState(COLORS[0]);

  useEffect(() => {
    if (open) {
      setName(category?.name || "");
      setType(category?.type || "expense");
      setColor(category?.color || COLORS[0]);
    }
  }, [open, category]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    onSubmit({ name: name.trim(), type, color });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-slate-900 border-slate-700 text-white">
        <DialogHeader>
          <DialogTitle>{category ? "Edit Category" : "New Category"}</DialogTitle>
          <DialogDescription className="text-slate-400">
            {category ? "Update category details" : "Create a new category"}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Category Name</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Office Operations"
                required
                className="bg-slate-800 border-slate-600 text-white"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="type">Type</Label>
              <Select value={type} onValueChange={(v: "income" | "expense") => setType(v)} disabled={!!category}>
                <SelectTrigger className="bg-slate-800 border-slate-600 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-slate-900 border-slate-700 text-white">
                  <SelectItem value="income">Income</SelectItem>
                  <SelectItem value="expense">Expense</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Color</Label>
              <div className="flex gap-2 flex-wrap">
                {COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setColor(c)}
                    className={`h-10 w-10 rounded-full transition ${
                      color === c ? "ring-2 ring-white ring-offset-2 ring-offset-slate-900" : ""
                    }`}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting || !name.trim()}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {category ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

interface SubcategoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  subcategory: { subcategory: Subcategory; categoryId: number } | null;
  categories: Category[];
  onSubmit: (data: { name: string; category_id: number }) => void;
  isSubmitting: boolean;
}

function SubcategoryDialog({
  open,
  onOpenChange,
  subcategory,
  categories,
  onSubmit,
  isSubmitting,
}: SubcategoryDialogProps) {
  const [name, setName] = useState("");
  const [categoryId, setCategoryId] = useState<number | "">("");

  useEffect(() => {
    if (open) {
      setName(subcategory?.subcategory.name || "");
      setCategoryId(subcategory?.categoryId || "");
    }
  }, [open, subcategory]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !categoryId) return;
    onSubmit({ name: name.trim(), category_id: Number(categoryId) });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-slate-900 border-slate-700 text-white">
        <DialogHeader>
          <DialogTitle>{subcategory?.subcategory.id ? "Edit Subcategory" : "New Subcategory"}</DialogTitle>
          <DialogDescription className="text-slate-400">
            {subcategory?.subcategory.id ? "Update subcategory details" : "Create a new subcategory"}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="subcategory-name">Subcategory Name</Label>
              <Input
                id="subcategory-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Office Supplies"
                required
                className="bg-slate-800 border-slate-600 text-white"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="category-select">Category</Label>
              <Select
                value={categoryId.toString()}
                onValueChange={(v) => setCategoryId(Number(v))}
                disabled={!!subcategory?.subcategory.id}
              >
                <SelectTrigger className="bg-slate-800 border-slate-600 text-white">
                  <SelectValue placeholder="Select a category" />
                </SelectTrigger>
                <SelectContent className="bg-slate-900 border-slate-700 text-white">
                  {Array.isArray(categories) ? categories.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id.toString()}>
                      {cat.name}
                    </SelectItem>
                  )) : null}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting || !name.trim() || !categoryId}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {subcategory?.subcategory.id ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
