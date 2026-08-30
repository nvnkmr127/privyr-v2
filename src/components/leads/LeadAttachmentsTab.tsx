"use client";

import { useState } from "react";
import { Paperclip, Plus, FileText, Image as ImageIcon, FileSpreadsheet, ExternalLink, Trash2, File } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { addAttachmentAction, deleteAttachmentAction } from "@/lib/actions/attachments";
import { useToast } from "@/hooks/use-toast";

interface AttachmentItem {
  id: string;
  leadId: string;
  fileName: string;
  fileUrl: string;
  fileSize?: number | null;
  fileType?: string | null;
  createdAt: Date | string;
}

interface LeadAttachmentsTabProps {
  leadId: string;
  initialAttachments: AttachmentItem[];
}

export function LeadAttachmentsTab({ leadId, initialAttachments }: LeadAttachmentsTabProps) {
  const [attachments, setAttachments] = useState<AttachmentItem[]>(initialAttachments);
  const [showAdd, setShowAdd] = useState(false);
  const [fileName, setFileName] = useState("");
  const [fileUrl, setFileUrl] = useState("");
  const [fileType] = useState("document");
  const [submitting, setSubmitting] = useState(false);
  const { toast } = useToast();

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fileName.trim() || !fileUrl.trim()) return;

    setSubmitting(true);
    try {
      const res = await addAttachmentAction({
        leadId,
        fileName,
        fileUrl,
        fileType,
      });
      if (!res.ok) {
        toast({ title: "Failed to add attachment", description: res.message, variant: "destructive" });
        return;
      }

      setAttachments((prev) => [res.data as AttachmentItem, ...prev]);
      setFileName("");
      setFileUrl("");
      setShowAdd(false);
      toast({
        title: "Attachment added",
        description: `Attached ${fileName} to lead`,
      });
    } catch {
      toast({
        title: "Failed to add attachment",
        description: "We couldn't reach the server. Please try again.",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const res = await deleteAttachmentAction(id, leadId);
      if (!res.ok) {
        toast({ title: "Failed to delete attachment", description: res.message, variant: "destructive" });
        return;
      }
      setAttachments((prev) => prev.filter((a) => a.id !== id));
      toast({ title: "Attachment removed" });
    } catch {
      toast({
        title: "Failed to delete attachment",
        description: "We couldn't reach the server. Please try again.",
        variant: "destructive",
      });
    }
  };

  const getFileIcon = (fileName: string, type?: string | null) => {
    const ext = fileName.split(".").pop()?.toLowerCase() || "";
    if (["jpg", "jpeg", "png", "gif", "svg", "webp"].includes(ext) || type?.includes("image")) {
      return <ImageIcon className="h-5 w-5 text-purple-500 shrink-0" />;
    }
    if (["xls", "xlsx", "csv"].includes(ext) || type?.includes("sheet")) {
      return <FileSpreadsheet className="h-5 w-5 text-emerald-500 shrink-0" />;
    }
    if (["pdf", "doc", "docx", "txt"].includes(ext) || type?.includes("pdf") || type?.includes("document")) {
      return <FileText className="h-5 w-5 text-blue-500 shrink-0" />;
    }
    return <File className="h-5 w-5 text-amber-500 shrink-0" />;
  };

  const formatFileSize = (bytes?: number | null) => {
    if (!bytes) return null;
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="flex items-center justify-between">
        <div>
          <h4 className="text-sm font-semibold text-foreground">Lead Attachments & Documents</h4>
          <p className="text-xs text-muted-foreground">Store proposals, contracts, quotes, and file links for this lead</p>
        </div>
        {!showAdd && (
          <Button size="sm" onClick={() => setShowAdd(true)} className="gap-1.5 text-xs">
            <Plus className="h-4 w-4" />
            Add Attachment
          </Button>
        )}
      </div>

      {/* Add Attachment Form */}
      {showAdd && (
        <form onSubmit={handleAdd} className="border rounded-2xl p-4 bg-muted/30 space-y-4 animate-in fade-in-50">
          <div className="flex items-center justify-between border-b pb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Attach File or Link</span>
            <Button type="button" variant="ghost" size="sm" onClick={() => setShowAdd(false)} className="h-7 text-xs">
              Cancel
            </Button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-muted-foreground block mb-1">Document / File Name *</label>
              <Input
                placeholder="e.g. Sales Proposal 2026.pdf"
                value={fileName}
                onChange={(e) => setFileName(e.target.value)}
                required
                className="h-9 text-sm"
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground block mb-1">File URL / Link *</label>
              <Input
                placeholder="https://..."
                value={fileUrl}
                onChange={(e) => setFileUrl(e.target.value)}
                required
                type="url"
                className="h-9 text-sm"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="outline" size="sm" onClick={() => setShowAdd(false)} className="h-8 text-xs">
              Cancel
            </Button>
            <Button type="submit" size="sm" disabled={submitting || !fileName.trim() || !fileUrl.trim()} className="h-8 text-xs gap-1.5">
              <Paperclip className="h-3.5 w-3.5" />
              Save Attachment
            </Button>
          </div>
        </form>
      )}

      {/* Attachments List */}
      {attachments.length === 0 ? (
        <div className="text-center py-10 border rounded-2xl bg-card text-muted-foreground text-xs space-y-2">
          <Paperclip className="h-8 w-8 mx-auto text-muted-foreground/60" />
          <p className="font-medium text-foreground text-sm">No attachments added yet</p>
          <p className="max-w-xs mx-auto text-muted-foreground">
            Attach quotes, documents, proposals, or image links associated with this lead.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {attachments.map((file) => {
            const sizeStr = formatFileSize(file.fileSize);
            const addedDate = new Date(file.createdAt).toLocaleDateString(undefined, { dateStyle: "short" });
            return (
              <div
                key={file.id}
                className="flex items-center justify-between p-3.5 rounded-2xl border bg-card hover:border-primary/40 transition-colors group"
              >
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  {getFileIcon(file.fileName, file.fileType)}
                  <div className="min-w-0 flex-1">
                    <a
                      href={file.fileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-medium text-sm text-foreground hover:underline truncate block"
                    >
                      {file.fileName}
                    </a>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                      <span>Added {addedDate}</span>
                      {sizeStr && <span>• {sizeStr}</span>}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1 shrink-0 ml-2">
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground" asChild>
                    <a href={file.fileUrl} target="_blank" rel="noopener noreferrer" title="Open Link">
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDelete(file.id)}
                    className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                    title="Delete Attachment"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
