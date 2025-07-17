"use client";

import { useState } from "react";
import { useDropzone } from "react-dropzone";

export default function TestImportPage() {
  const [files, setFiles] = useState<File[]>([]);
  const [content, setContent] = useState<string>("");

  const onDrop = async (acceptedFiles: File[]) => {
    console.log("onDrop called with files:", acceptedFiles);
    setFiles(acceptedFiles);
    
    if (acceptedFiles.length > 0) {
      const file = acceptedFiles[0];
      try {
        const text = await file.text();
        setContent(text);
        console.log("File content:", text);
      } catch (error) {
        console.error("Error reading file:", error);
      }
    }
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/json': ['.json'],
      'text/plain': ['.txt', '.jsonl'],
    },
  });

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Test Import Functionality</h1>
      
      <div
        {...getRootProps()}
        className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer
          ${isDragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300'}
        `}
      >
        <input {...getInputProps()} />
        <p>
          {isDragActive
            ? "Drop the files here..."
            : "Drag 'n' drop some files here, or click to select files"}
        </p>
      </div>

      {files.length > 0 && (
        <div className="mt-4">
          <h2 className="font-bold">Files:</h2>
          {files.map((file, index) => (
            <div key={index}>
              <p>{file.name} - {file.size} bytes</p>
            </div>
          ))}
        </div>
      )}

      {content && (
        <div className="mt-4">
          <h2 className="font-bold">Content Preview:</h2>
          <pre className="bg-gray-100 p-4 rounded overflow-auto max-h-96">
            {content.substring(0, 1000)}...
          </pre>
        </div>
      )}
    </div>
  );
}