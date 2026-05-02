import { Button, Result, Typography } from "antd";
import { t } from "i18next";
import { useRouteError } from "react-router-dom";

const { Paragraph, Text } = Typography;

const GlobalErrorElement = () => {
  const error = useRouteError();

  const reload = () => {

    try {
      if (window.electronAPI) {
        window.location.hash = "#/login";
        setTimeout(() => window.location.reload(), 300);
      } else {
        window.location.reload();
      }
    } catch {
      window.location.reload();
    }
  };

  const errorMessage = (() => {
    if (error instanceof Error) {
      return `${error.name}: ${error.message}\n${error.stack || ""}`;
    }
    try {
      return JSON.stringify(error, null, 2);
    } catch {
      return String(error ?? "未知错误");
    }
  })();


  return (
    <div className="flex h-full w-full flex-col items-center justify-center">
      <Result
        status="error"
        title={t("toast.somethingError")}
        extra={
          <Button type="primary" onClick={reload}>
            {t("placeholder.recover")}
          </Button>
        }
      />
      <div className="max-w-xl px-4">
        <Paragraph copyable className="rounded bg-gray-50 p-3">
          <Text type="secondary" className="whitespace-pre-wrap break-all text-xs">
            {errorMessage}
          </Text>
        </Paragraph>
      </div>
    </div>
  );
};

export default GlobalErrorElement;
