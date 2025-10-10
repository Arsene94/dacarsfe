import { useServerInsertedHTML } from "next/navigation";

import { ADMIN_RICH_TEXT_STYLE_ID, ADMIN_RICH_TEXT_STYLES } from "./adminStyles";

const AdminGlobalStyles = () => {
    useServerInsertedHTML(() => (
        <style
            id={ADMIN_RICH_TEXT_STYLE_ID}
            dangerouslySetInnerHTML={{ __html: ADMIN_RICH_TEXT_STYLES }}
        />
    ));

    return null;
};

export default AdminGlobalStyles;
