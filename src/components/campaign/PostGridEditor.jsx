import React from 'react';
import { Sparkles, RefreshCw } from 'lucide-react';

const PostGridEditor = ({ postGridUrl }) => {
    return (
        <React.Fragment>
            <main className="rounded-2xl border border-gray-200 bg-white shadow-sm">
                {/* Header */}
                <section className="flex items-center justify-between px-6 py-4 border-b">
                    <div className="flex items-center gap-2">
                        <span className="flex items-center gap-2 postgrid-badge rounded-full text-xs font-medium bg-emerald-100 text-emerald-700">
                            <Sparkles className="w-3.5 h-3.5" />
                            PostGrid Editor
                        </span>
                    </div>

                    <button className="flex cursor-pointer regenerate-btn items-center gap-2 text-sm font-medium text-gray-700 hover:text-gray-900">
                        <RefreshCw className="w-4 h-4" />
                        Regenerate
                    </button>
                </section>

                {/* PostGrid Editor */}
                <section className="p-6">
                    <main className="relative rounded-2xl bg-gray-50">
                        {/* Postcard Preview */}
                        <section className="overflow-hidden aspect-3/2 rounded-xl bg-black shadow-lg flex items-center justify-center">
                            {postGridUrl ? (
                                <iframe
                                    src={postGridUrl}
                                    title="PostGrid Template Editor"
                                    className="w-full h-full"
                                    id="postgrid-editor"
                                ></iframe>
                            ): (
                                <p className="flex items-center justify-center h-full text-sm text-white">
                                  Preview is currently unavailable.
                                </p>
                            )}
                        </section>

                        {/* Postgrid Editor Footer */}
                        <section className="postgrid-footer flex items-center justify-center gap-2 text-xs text-gray-500">
                            <Sparkles className="w-3 h-3" />
                            Click any element to select it for editing
                        </section>
                    </main>
                </section>
            </main>
        </React.Fragment>
    );
};

export default PostGridEditor;