import { Component, ErrorInfo, ReactNode } from "react";

type ErrorBoundaryProps = {
  logTips?: string;
  placeholder: ReactNode;
  children: ReactNode;
};

type ErrorBoundaryState = {
  hasError: boolean;
  logTips?: string;
};

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, logTips: props.logTips };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {

    this.setState({ hasError: true });
  }

  render() {
    if (this.state.hasError) {
      return this.props.placeholder;
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
