import { useServerInsertedHTML } from "next/navigation";

import { TERMS_CONTENT_STYLE_ID, TERMS_CONTENT_STYLES } from "./termsStyles";

const TermsContentStyles = () => {
    useServerInsertedHTML(() => (
        <style
            id={TERMS_CONTENT_STYLE_ID}
            dangerouslySetInnerHTML={{ __html: TERMS_CONTENT_STYLES }}
        />
    ));

    return null;
};

export default TermsContentStyles;
