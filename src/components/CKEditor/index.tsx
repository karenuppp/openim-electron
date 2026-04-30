import "./index.scss";
import "ckeditor5/ckeditor5.css";

import { ClassicEditor } from "@ckeditor/ckeditor5-editor-classic";
import { Essentials } from "@ckeditor/ckeditor5-essentials";
import { Paragraph } from "@ckeditor/ckeditor5-paragraph";
import ImageInlineEditing from "@ckeditor/ckeditor5-image/src/image/imageinlineediting.js";
import AutoImage from "@ckeditor/ckeditor5-image/src/autoimage.js";
import { CKEditor } from "@ckeditor/ckeditor5-react";
import {
  forwardRef,
  ForwardRefRenderFunction,
  memo,
  useImperativeHandle,
  useRef,
} from "react";

export type CKEditorRef = {
  editor: ClassicEditor | null;
  focus: (moveToEnd?: boolean) => void;
  insertImage: (src: string) => void;
};

interface CKEditorProps {
  value: string;
  placeholder?: string;
  onChange?: (value: string) => void;
  onEnter?: () => void;
}

export interface EmojiData {
  src: string;
  alt: string;
}

const keyCodes = {
  delete: 46,
  backspace: 8,
};

const Index: ForwardRefRenderFunction<CKEditorRef, CKEditorProps> = (
  { value, placeholder, onChange, onEnter },
  ref,
) => {
  const ckEditor = useRef<ClassicEditor | null>(null);

  const focus = (moveToEnd = false) => {
    const editor = ckEditor.current;
    if (!editor) return;
    const model = editor.model;
    const view = editor.editing.view;
    const root = model.document.getRoot();
    if (moveToEnd && root) {
      const range = model.createRange(model.createPositionAt(root, "end"));
      model.change((writer) => {
        writer.setSelection(range);
      });
    }
    view.focus();
  };

  const listenKeydown = (editor: ClassicEditor) => {
    editor.editing.view.document.on(
      "keydown",
      (evt, data) => {
        if (data.keyCode === 13 && !data.shiftKey) {
          data.preventDefault();
          evt.stop();
          onEnter?.();
          return;
        }
        if (data.keyCode === keyCodes.backspace || data.keyCode === keyCodes.delete) {
          const selection = editor.model.document.selection;
          const hasSelectContent = !editor.model.getSelectedContent(selection).isEmpty;
          const hasEditorContent = Boolean(editor.getData());

          if (!hasEditorContent) {
            return;
          }

          if (hasSelectContent) return;
        }
      },
      { priority: "high" },
    );
  };

  useImperativeHandle(
    ref,
    () => ({
      editor: ckEditor.current,
      focus,
      insertImage: (src: string) => {
        const ed = ckEditor.current;
        if (!ed) {
          console.error("[CKEditor insertImage] editor not ready!");
          return;
        }
        console.log("[CKEditor insertImage] called with src length:", src?.length, "editor ready:", !!ed);
        if (!src || !src.startsWith("data:")) {
          console.error("[CKEditor insertImage] invalid src, not a data URL");
          return;
        }
        console.log("[CKEditor insertImage] src preview:", src.substring(0, 80) + "...");
        try {
          // Strategy 1: Use model writer to create an imageInline element
          ed.model.change((writer: any) => {
            const imgElement = writer.createElement("imageInline", { src });
            const selection = ed.model.document.selection;
            const position = selection.getFirstPosition();
            if (position) {
              console.log("[CKEditor insertImage] inserting at position:", position.path);
              writer.insert(imgElement, position);
              console.log("[CKEditor insertImage] model insert SUCCESS");
            } else {
              console.error("[CKEditor insertImage] no valid position found");
            }
          });
        } catch (e1: any) {
          console.error("[CKEditor insertImage] model change failed:", e1.message);
          try {
            // Strategy 2: Execute insertImage command
            console.log("[CKEditor insertImage] trying execute('insertImage')...");
            ed.execute("insertImage", { src });
            console.log("[CKEditor insertImage] execute insertImage SUCCESS");
          } catch (e2: any) {
            console.error("[CKEditor insertImage] execute failed:", e2.message);
            try {
              // Strategy 3: setData with raw HTML
              console.log("[CKEditor insertImage] trying setData fallback...");
              const currentData = ed.getData();
              ed.setData(currentData + `<img src="${src}" />`);
              console.log("[CKEditor insertImage] setData SUCCESS");
            } catch (e3: any) {
              console.error("[CKEditor insertImage] ALL methods failed:", e3.message);
            }
          }
        }
      },
    }),
    [],
  );

  return (
    <CKEditor
      editor={ClassicEditor}
      data={value}
      config={{
        placeholder,
        toolbar: [],
        image: {
          toolbar: [],
          insert: {
            type: "inline",
          },
        },
        plugins: [Essentials, Paragraph, ImageInlineEditing, AutoImage],
      }}
      onReady={(editor) => {
        ckEditor.current = editor;
        listenKeydown(editor);
        focus(true);
      }}
      onChange={(event, editor) => {
        const data = editor.getData();
        onChange?.(data);
      }}
    />
  );
};

export default forwardRef(Index);
