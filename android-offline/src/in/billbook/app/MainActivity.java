package in.billbook.app;
import android.app.*;
import android.os.*;
import android.content.*;
import android.net.Uri;
import android.webkit.*;
import android.print.*;
import android.database.Cursor;
import android.provider.ContactsContract;
import java.io.*;
import java.nio.charset.StandardCharsets;

public class MainActivity extends Activity {
  private WebView web, printWeb;
  private boolean pdfBusy=false,contactBusy=false;
  private ValueCallback<Uri[]> chooser;
  private String pendingBackup;
  private static final String ORIGIN="https://app.billbook.local/";
  @Override public void onCreate(Bundle b) {
    super.onCreate(b);
    File shared=new File(getCacheDir(),"shared-bills");File[] previous=shared.listFiles();if(previous!=null)for(File file:previous)if(file.lastModified()<System.currentTimeMillis()-7L*24*60*60*1000)file.delete();
    getWindow().setStatusBarColor(0xfff5f7fb);
    getWindow().setNavigationBarColor(0xffffffff);
    web=new WebView(this);
    android.widget.FrameLayout frame=new android.widget.FrameLayout(this);frame.addView(web,new android.widget.FrameLayout.LayoutParams(-1,-1));
    getWindow().getDecorView().setSystemUiVisibility(android.view.View.SYSTEM_UI_FLAG_LAYOUT_STABLE|android.view.View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN|android.view.View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION|android.view.View.SYSTEM_UI_FLAG_LIGHT_STATUS_BAR|android.view.View.SYSTEM_UI_FLAG_LIGHT_NAVIGATION_BAR);
    frame.setOnApplyWindowInsetsListener((v,i)->{
      int left=i.getSystemWindowInsetLeft(),top=i.getSystemWindowInsetTop(),right=i.getSystemWindowInsetRight(),bottom=i.getSystemWindowInsetBottom();boolean keyboard=bottom>150*getResources().getDisplayMetrics().density;
      if(Build.VERSION.SDK_INT>=30){android.graphics.Insets bars=i.getInsets(android.view.WindowInsets.Type.systemBars()|android.view.WindowInsets.Type.displayCutout());android.graphics.Insets ime=i.getInsets(android.view.WindowInsets.Type.ime());left=bars.left;top=bars.top;right=bars.right;bottom=Math.max(bars.bottom,ime.bottom);keyboard=i.isVisible(android.view.WindowInsets.Type.ime());}
      v.setPadding(left,top,right,bottom);web.evaluateJavascript("if(document.body)document.body.classList.toggle('keyboard-open',"+keyboard+")",null);return i.consumeSystemWindowInsets();
    });
    web.getSettings().setJavaScriptEnabled(true);
    web.getSettings().setDomStorageEnabled(true);
    web.getSettings().setAllowFileAccess(false);
    web.getSettings().setAllowContentAccess(true);
    web.getSettings().setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
    web.addJavascriptInterface(new Bridge(),"Android");
    web.setWebViewClient(new WebViewClient(){
      @Override public WebResourceResponse shouldInterceptRequest(WebView v,WebResourceRequest r){
        Uri u=r.getUrl();
        if(!"app.billbook.local".equals(u.getHost()))return new WebResourceResponse("text/plain","UTF-8",new ByteArrayInputStream(new byte[0]));
        String path=u.getPath();if(path==null||path.equals("/"))path="/index.html";
        if(path.contains(".."))return null;
        try {String mime=path.endsWith(".js")?"text/javascript":path.endsWith(".css")?"text/css":"text/html";
          return new WebResourceResponse(mime,"UTF-8",getAssets().open(path.substring(1)));
        }catch(IOException e){return new WebResourceResponse("text/plain","UTF-8",new ByteArrayInputStream(new byte[0]));}
      }
      @Override public boolean shouldOverrideUrlLoading(WebView v,WebResourceRequest r){return !r.getUrl().toString().startsWith(ORIGIN);}
    });
    web.setWebChromeClient(new WebChromeClient(){
      @Override public boolean onJsAlert(WebView v,String url,String message,JsResult result){new AlertDialog.Builder(MainActivity.this).setMessage(message).setPositiveButton("OK",(d,w)->result.confirm()).setOnCancelListener(d->result.cancel()).show();return true;}
      @Override public boolean onJsConfirm(WebView v,String url,String message,JsResult result){new AlertDialog.Builder(MainActivity.this).setMessage(message).setPositiveButton("Continue",(d,w)->result.confirm()).setNegativeButton("Cancel",(d,w)->result.cancel()).setOnCancelListener(d->result.cancel()).show();return true;}

      @Override public boolean onShowFileChooser(WebView v,ValueCallback<Uri[]> cb,FileChooserParams p){
        if(chooser!=null)chooser.onReceiveValue(null);chooser=cb;
        Intent i=new Intent(Intent.ACTION_OPEN_DOCUMENT);i.addCategory(Intent.CATEGORY_OPENABLE);i.setType("image/*");
        try{startActivityForResult(i,10);}catch(Exception e){chooser.onReceiveValue(null);chooser=null;return false;}return true;
      }
    });
    setContentView(frame);frame.requestApplyInsets();web.loadUrl(ORIGIN);
  }
  private void notifyError(String s){web.evaluateJavascript("toast("+org.json.JSONObject.quote(s)+")",null);}
  private void shareGeneratedPdf(File file,String name){
    if(isFinishing()||isDestroyed()){pdfBusy=false;return;}
    try{Uri uri=new Uri.Builder().scheme("content").authority("in.billbook.app.pdf").appendPath("pdf").appendPath(file.getName()).build();
      Intent share=new Intent(Intent.ACTION_SEND);share.setType("application/pdf");share.putExtra(Intent.EXTRA_STREAM,uri);share.putExtra(Intent.EXTRA_SUBJECT,name);share.setClipData(ClipData.newRawUri("Bill PDF",uri));share.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
      Intent chooser=Intent.createChooser(share,"Share bill PDF");chooser.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);startActivity(chooser);
    }catch(Exception e){notifyError("No compatible app is available to share this PDF.");}
    finally{pdfBusy=false;web.evaluateJavascript("onPdfShareDone(true)",null);}
  }
  class Bridge {
    @JavascriptInterface public void pickContact(){runOnUiThread(()->{
      if(contactBusy)return;
      Intent i=new Intent(Intent.ACTION_PICK);i.setType(ContactsContract.CommonDataKinds.Phone.CONTENT_TYPE);
      try{contactBusy=true;startActivityForResult(i,13);}catch(Exception e){contactBusy=false;notifyError("No contacts picker is available. Add the customer manually.");}
    });}
    @JavascriptInterface public void sharePdf(String json,String name){runOnUiThread(()->{
      if(pdfBusy){notifyError("PDF generation is already in progress.");return;}
      if(json.length()>15000000){web.evaluateJavascript("onPdfShareDone(false)",null);notifyError("Invoice image is too large to share.");return;}
      pdfBusy=true;
      new Thread(()->{File file=null;try{
        File dir=new File(getCacheDir(),"shared-bills");if(!dir.isDirectory()&&!dir.mkdirs())throw new IOException("Cannot create PDF folder");
        String clean=name.replaceAll("[^A-Za-z0-9_-]","_");if(clean.length()>80)clean=clean.substring(0,80);
        file=new File(dir,clean+"_"+System.currentTimeMillis()+".pdf");BillPdf.create(new org.json.JSONObject(json),file);final File ready=file;
        runOnUiThread(()->shareGeneratedPdf(ready,name));
      }catch(Exception e){if(file!=null)file.delete();runOnUiThread(()->{pdfBusy=false;if(!isDestroyed()){web.evaluateJavascript("onPdfShareDone(false)",null);notifyError("Could not generate PDF. Check device storage or use Save / Print PDF.");}});}},"BillBook-PDF").start();
    });}
    @JavascriptInterface public void printInvoice(String html,String name){runOnUiThread(()->{
      if(html.length()>15000000){notifyError("Invoice image is too large to print.");return;}
      if(printWeb!=null)printWeb.destroy();printWeb=new WebView(MainActivity.this);
      printWeb.getSettings().setJavaScriptEnabled(false);
      printWeb.setWebViewClient(new WebViewClient(){@Override public void onPageFinished(WebView v,String url){
        PrintManager pm=(PrintManager)getSystemService(PRINT_SERVICE);
        pm.print(name.replaceAll("[^A-Za-z0-9_-]","_"),v.createPrintDocumentAdapter(name),new PrintAttributes.Builder().setMediaSize(PrintAttributes.MediaSize.ISO_A4).setColorMode(PrintAttributes.COLOR_MODE_COLOR).build());
      }});printWeb.loadDataWithBaseURL(ORIGIN,html,"text/html","UTF-8",null);
    });}
    @JavascriptInterface public void shareText(String text){runOnUiThread(()->{Intent i=new Intent(Intent.ACTION_SEND);i.setType("text/plain");i.putExtra(Intent.EXTRA_TEXT,text);startActivity(Intent.createChooser(i,"Share bill summary"));});}
    @JavascriptInterface public void copyText(String text){runOnUiThread(()->{android.content.ClipboardManager cm=(android.content.ClipboardManager)getSystemService(CLIPBOARD_SERVICE);cm.setPrimaryClip(ClipData.newPlainText("BillBook payment details",text));});}
    @JavascriptInterface public void contactSupport(String email,String subject,String body){runOnUiThread(()->{
      if(email.length()>254||!android.util.Patterns.EMAIL_ADDRESS.matcher(email).matches()){notifyError("Add a valid support email in Settings.");return;}
      Intent i=new Intent(Intent.ACTION_SENDTO,Uri.parse("mailto:"+Uri.encode(email)+"?subject="+Uri.encode(subject)+"&body="+Uri.encode(body)));
      try{startActivity(i);}catch(ActivityNotFoundException e){notifyError("No email app is available. Install an email app, then try again.");}
    });}
    @JavascriptInterface public void exportBackup(String json){runOnUiThread(()->{pendingBackup=json;Intent i=new Intent(Intent.ACTION_CREATE_DOCUMENT);i.setType("application/json");i.addCategory(Intent.CATEGORY_OPENABLE);i.putExtra(Intent.EXTRA_TITLE,"BillBook-backup-"+System.currentTimeMillis()+".json");startActivityForResult(i,11);});}
    @JavascriptInterface public void importBackup(){runOnUiThread(()->{Intent i=new Intent(Intent.ACTION_OPEN_DOCUMENT);i.setType("*/*");i.addCategory(Intent.CATEGORY_OPENABLE);startActivityForResult(i,12);});}
  }
  @Override protected void onActivityResult(int request,int result,Intent data){
    super.onActivityResult(request,result,data);
    if(request==13){
      contactBusy=false;if(result!=RESULT_OK||data==null||data.getData()==null)return;
      Uri uri=data.getData();
      if(!"content".equals(uri.getScheme())||!ContactsContract.AUTHORITY.equals(uri.getAuthority())){notifyError("Unsupported contact selection. Add the customer manually.");return;}
      try(Cursor c=getContentResolver().query(uri,new String[]{ContactsContract.CommonDataKinds.Phone.DISPLAY_NAME,ContactsContract.CommonDataKinds.Phone.NUMBER},null,null,null)){
        if(c==null||!c.moveToFirst()){notifyError("This contact has no available phone number.");return;}
        org.json.JSONObject contact=new org.json.JSONObject();contact.put("name",c.getString(0)==null?"":c.getString(0));contact.put("phone",c.getString(1)==null?"":c.getString(1));
        web.evaluateJavascript("receiveContact("+contact.toString()+")",null);
      }catch(Exception e){notifyError("Could not read the selected contact. You can enter it manually.");}return;
    }
    if(request==10){if(chooser!=null){chooser.onReceiveValue(result==RESULT_OK&&data!=null?new Uri[]{data.getData()}:null);chooser=null;}return;}
    if(result!=RESULT_OK||data==null){pendingBackup=null;return;}
    try{
      if(request==11){try(OutputStream out=getContentResolver().openOutputStream(data.getData())){out.write(pendingBackup.getBytes(StandardCharsets.UTF_8));}pendingBackup=null;notifyError("Backup saved.");}
      if(request==12){try(InputStream in=getContentResolver().openInputStream(data.getData());ByteArrayOutputStream out=new ByteArrayOutputStream()){
        byte[] buf=new byte[8192];int n;while((n=in.read(buf))!=-1){out.write(buf,0,n);if(out.size()>15000000)throw new IOException("Backup is too large");}
        web.evaluateJavascript("restoreBackup("+org.json.JSONObject.quote(out.toString("UTF-8"))+")",null);
      }}
    }catch(Exception e){pendingBackup=null;notifyError("Could not read or save file. Please try again.");}
  }
  @Override public void onBackPressed(){web.evaluateJavascript("goBack()",null);}
  @Override protected void onDestroy(){if(chooser!=null)chooser.onReceiveValue(null);if(printWeb!=null)printWeb.destroy();web.destroy();super.onDestroy();}
}
